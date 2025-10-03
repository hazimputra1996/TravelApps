#!/bin/sh
set -e

echo "[entrypoint] Starting backend container..."

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint] ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

echo "[entrypoint] Waiting for database..."
URL_HOST=$(node -e "try{const u=new URL(process.env.DATABASE_URL);process.stdout.write(u.hostname)}catch(e){process.exit(1)}") || { echo "[entrypoint] Could not parse DATABASE_URL host" >&2; exit 1; }
URL_PORT=$(node -e "try{const u=new URL(process.env.DATABASE_URL);process.stdout.write(u.port||'5432')}catch(e){process.exit(1)}") || { echo "[entrypoint] Could not parse DATABASE_URL port" >&2; exit 1; }
echo "[entrypoint] Parsed DB host=$URL_HOST port=$URL_PORT"
TRIES=0
while true; do
  if pg_isready -h "$URL_HOST" -p "$URL_PORT" -q 2>/dev/null; then
    echo "[entrypoint] pg_isready reports database accepting connections"
    break
  fi
  # Fallback raw TCP attempt
  if node -e "require('net').createConnection($URL_PORT,'$URL_HOST').on('error',()=>process.exit(1)).on('connect',c=>{c.end();});" 2>/dev/null; then
    echo "[entrypoint] TCP connection succeeded (no pg_isready response yet)"
    break
  fi
  TRIES=$((TRIES+1))
  if [ $TRIES -gt 45 ]; then
    echo "[entrypoint] Database not reachable after $TRIES attempts (host=$URL_HOST port=$URL_PORT)" >&2
    echo "[entrypoint] Printing /etc/hosts for diagnostics:" >&2
    cat /etc/hosts >&2 || true
    echo "[entrypoint] DNS lookup of host with getent hosts (if available):" >&2
    getent hosts "$URL_HOST" >&2 || echo "(getent not available)" >&2
    exit 1
  fi
  sleep 2
done

echo "[entrypoint] Running prisma migrate deploy..."
if [ ! -d ./prisma/migrations ] || [ -z "$(ls -A ./prisma/migrations 2>/dev/null)" ]; then
  echo "[entrypoint] No migration files found. Running 'prisma db push' to sync schema..."
  npx prisma db push
else
  set +e
  OUTPUT=$(npx prisma migrate deploy 2>&1)
  STATUS=$?
  set -e
  echo "$OUTPUT"
  if [ $STATUS -ne 0 ]; then
    echo "[entrypoint] migrate deploy failed (status $STATUS). Attempting prisma db push as fallback..." >&2
    npx prisma db push
  elif echo "$OUTPUT" | grep -qi "No pending migrations"; then
    echo "[entrypoint] No pending migrations (ok)."
  fi
fi

echo "[entrypoint] Seeding defaults handled in runtime (index.ts)."

echo "[entrypoint] Starting application..."
exec node dist/index.js
