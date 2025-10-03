# Travel Expense Tracker

Public, no-auth travel trip & expense tracker with multi-trip itineraries, manual (user-entered) foreign currency to MYR conversion, analytics dashboards, CSV/PDF export and printable itinerary view.

> NOTE: This app is intentionally open (no authentication) per requirements. Anyone with the URL can create / modify / delete data. For a production / private use-case you'd add auth & authorization layers.

## Tech Stack
Backend:
- Node.js + Express
- Prisma ORM (PostgreSQL)
 - Manual or automatic FX rates (user-supplied OR auto-fetched when left blank)
- PDF export (pdfkit), CSV export (csv-stringify)

Frontend:
- Next.js (React) + SWR for data fetching
- chart.js + react-chartjs-2 for charts

Dev / Ops:
- Docker & docker-compose (optional local orchestration)
- Render (free) for backend deployment
- Vercel or Netlify (free) for frontend deployment

## Data Model (Simplified)
Trip → ItineraryItem (many) with Category (global).
For non-MYR currencies the user may either specify the exchange rate (1 UNIT = X MYR) manually or leave it blank to auto-fetch a live rate; MYR values are then stored.

## Backend Environment Variables (`backend/.env`)
| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | yes | PostgreSQL connection string (Prisma format) |
| PORT | no (default 4000) | HTTP port |
| CORS_ORIGIN | no | Allowed origin(s); `*` for demo |

Example:
```
## Local (direct / non-Docker) example
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/travelexpense?schema=public"
PORT=4000
## (Historical FX API removed; user enters per-item rate)
CORS_ORIGIN="http://localhost:3000"

## Docker Compose example (IMPORTANT: use service hostname `db`, not localhost)
# This value is what containers use to reach Postgres
# (the `db` service name defined in docker-compose.yml acts as an internal DNS hostname)
DATABASE_URL="postgresql://postgres:postgres@db:5432/travelexpense?schema=public"
PORT=4000
CORS_ORIGIN="http://localhost:3000"
```

## Frontend Environment Variables (`frontend/.env.local`)
| Variable | Required | Description |
|----------|----------|-------------|
| NEXT_PUBLIC_API_BASE | yes | Full base URL of backend (e.g. http://localhost:4000 or https://your-backend.onrender.com) |

Example:
```
NEXT_PUBLIC_API_BASE="http://localhost:4000"
```

## Local Development (Recommended: 2 terminals)
### Prerequisites (Install First)
| Tool | Minimum Version | Purpose | Install / Notes |
|------|-----------------|---------|-----------------|
| Git | any recent | Clone / version control | https://git-scm.com/downloads |
| Node.js | 18.x or 20.x LTS | Run backend & frontend (Next.js) | https://nodejs.org (use LTS) |
| npm | Bundled with Node | Package manager | After Node install, run `node -v && npm -v` |
| PostgreSQL | 14+ | Persistent database | Native install OR via Docker image `postgres:16-alpine` |
| Docker Desktop (optional) | latest | Containerized local stack | https://www.docker.com/products/docker-desktop |
| (Optional) VS Code Extensions | - | Dev experience | Prisma, ESLint, Prettier |

Windows Tips:
1. Ensure Docker Desktop has WSL2 backend enabled.
2. If using native Postgres, add its `bin` folder to PATH (for pg_dump etc.).
3. Use PowerShell or VS Code integrated terminal. Commands below assume PowerShell.

1. Clone repo (or copy files)
2. Start PostgreSQL (choose one):
	- Docker: `docker compose up -d db` (root folder) OR
	- Manual local Postgres (make sure DATABASE_URL matches credentials)
3. Backend setup:
	```
	cd backend
	npm install
	npx prisma migrate dev --name init
	npm run dev
	```
4. Frontend setup (new terminal):
	```
	cd frontend
	npm install
	npm run dev
	```
5. Open http://localhost:3000

The backend runs at http://localhost:4000 (health check: /health).

## One-Command (Full Stack) via Docker Compose
The stack now performs automatic database migrations and starts all services with a single command (no manual `prisma migrate dev` needed):
```
docker compose up --build
```
If the backend fails to start with database connection errors, double‑check that your `backend/.env` (or compose env override) uses `@db:5432` (not `@localhost:5432`) while running inside Docker.
What happens under the hood:
1. `db` (PostgreSQL) container starts.
2. `backend` waits for the DB socket to be reachable.
3. Runs `prisma migrate deploy` (idempotent) to apply any pending migrations.
4. Builds/serves the API on http://localhost:4000.
5. Healthcheck signals ready; then `frontend` starts and serves http://localhost:3000.

You can stop everything with:
```
docker compose down
```
Remove data volume (fresh start):
```
docker compose down -v
```

Tail logs (another terminal):
```
docker compose logs -f backend
```

If you add a new migration later, just re-run:
```
docker compose up --build
```

## Prisma Migrations
Create migration after schema edits:
```
cd backend
npx prisma migrate dev --name <change>
```
Generate client only:
```
npx prisma generate
```
Deploy migrations in production (Render):
```
npx prisma migrate deploy
```

## API Overview (Base: /api/v1)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /trips | List trips (with aggregate summaries) |
| POST | /trips | Create trip |
| GET | /trips/:id | Trip with items & categories |
| PUT | /trips/:id | Update trip |
| DELETE | /trips/:id | Delete trip |
| GET | /trips/:tripId/items | List items |
| POST | /trips/:tripId/items | Create itinerary item (manual FX rate if currency != MYR) |
| PUT | /trips/:tripId/items/:itemId | Update item (recompute MYR if rate / cost changed) |
| DELETE | /trips/:tripId/items/:itemId | Delete item |
| GET | /trips/:tripId/analytics/summary | Totals + remaining |
| GET | /trips/:tripId/analytics/by-category | Category breakdown |
| GET | /trips/:tripId/analytics/daily-trend | Daily aggregated trend |
| GET | /trips/:tripId/analytics/export.csv | CSV export |
| GET | /trips/:tripId/analytics/export.pdf | PDF export |
| GET | /categories | List categories |
| POST | /categories | Add custom category |

All endpoints are unauthenticated by design.

## Deployment Guide

### 1. Deploy Backend on Render (Free Tier)
1. Push this repository to GitHub.
2. Create a Render account → New → Web Service.
3. Connect repo, pick `backend` as root directory (Render: set Root Directory to `backend`).
4. Environment:
	- Runtime: Node 20
	- Build Command: `npm install && npx prisma migrate deploy && npm run build`
	- Start Command: `npm start`
5. Add Render Environment Variables:
	- `DATABASE_URL` (Render can also provision a free Postgres: create it first, copy internal URL)
	- `CORS_ORIGIN=*` (or restrict later to frontend domain)
6. Save & Deploy. Note the backend URL (e.g. https://travel-expense-api.onrender.com).

### 2. Deploy Frontend on Vercel
1. Import GitHub repo into Vercel.
2. Set Project Settings:
	- Framework: Next.js (detected)
	- Root Directory: `frontend`
3. Add Environment Variable:
	- `NEXT_PUBLIC_API_BASE` = Render backend URL (e.g. https://travel-expense-api.onrender.com)
4. Deploy. Visit the Vercel domain.

### Netlify Alternative
1. New Site → Import repository.
2. Base directory: `frontend`
3. Build command: `npm run build`
4. Publish directory: `.next` (enable Next.js runtime plugin if prompted) or use Next plugin.
5. Add `NEXT_PUBLIC_API_BASE` environment variable.

### Post-Deployment Smoke Test
1. Open frontend domain → Create a trip → Add a few items with different currencies.
2. Confirm amounts convert to MYR and charts update.
3. Test CSV/PDF export links (should download / open files from backend domain).

### Self-Hosting on Your Own Server / EC2
For running on an EC2 instance (or any Docker-capable VPS) with Nginx reverse proxy and optional HTTPS, see: `docs/deploy-ec2.md`.

Shortcut:
```
docker compose -f docker-compose.prod.yml up -d --build
```
Then attach a reverse proxy (already included via `nginx` service on port 80). Configure DNS to point your domain to the server.

## FX Rate Handling (Manual & Automatic)
When adding or editing an item in a non-MYR currency you have two options for the exchange rate (1 UNIT foreign = X MYR):

1. Manual: Enter the rate explicitly (e.g. 1 USD = 4.7000 MYR). This value is stored and used to compute `myrExpected` / `myrActual`.
2. Automatic: Leave the FX field blank. The backend will try to fetch a live rate and mark the item with `autoFx = true`.

Provider order & logic:
- Primary: `exchangerate.host` direct request (BASE -> MYR)
- Fallback: `exchangerate.host` inverse (MYR -> BASE, then inverted)
- Tertiary: `open.er-api.com` (BASE -> rates, pick MYR)

Implementation details:
- 3s total timeout (first provider may consume part of this; remaining attempts re-use same abort signal until timeout).
- Successful rate cached in-memory for 10 minutes per currency (subsequent items reuse cached rate instantly).
- If all providers fail, the API responds `502` with message: `Live FX unavailable; please enter exchangeRate manually`.
- Frontend will surface a friendly prompt to manually enter the rate in that case.
- On update: If you clear a previously manual rate the system will attempt auto again (unless currency is MYR).
- The stored `exchangeRate` is the numeric value used at computation time; changing costs or rate triggers recomputation of MYR amounts.
- `autoFx` boolean flag on each item indicates whether the stored rate was auto-fetched.

Accuracy & disclaimer:
- Rates are for convenience only; not guaranteed for financial settlement.
- No historical locking; editing at a later date with auto will use a fresh rate.
- For precise accounting always verify and, if needed, override manually.

Operational notes:
- Memory cache resets on backend restart (first request after restart fetches live rate again).
- If you require persistence or historical averaging, extend the model to store source + timestamp.

Troubleshooting auto FX:
- Check backend logs for lines beginning with `[fx]` to see which provider failed.
- Verify outbound internet from the backend container/host.
- Ensure currency code is valid ISO (e.g. `USD`, `EUR`, `JPY`).
- If persistent failure: enter the rate manually while investigating.

## FX Rate Overrides (Date-Based)
You can now define a fixed exchange rate for a specific calendar date (UTC) and currency. When creating or updating an itinerary item:

Precedence order for determining the `exchangeRate` used:
1. Manual: If the item form includes a rate value you entered.
2. Date Override: If no manual rate is provided and an override exists for (item UTC date, currency).
3. Automatic Live Fetch: Provider chain (exchangerate.host direct -> exchangerate.host inverse -> open.er-api.com).

How it works:
- Override entity stores: `date (DATE)`, `currency (STRING)`, `rate (DECIMAL 18,8)`.
- Matching logic extracts the UTC date portion of the item `dateTime` (YYYY-MM-DD) and looks up a composite unique (date,currency).
- If found, backend sets `exchangeRate = override.rate` and `autoFx = false` (treated like a manual deterministic rate).
- If not found, backend proceeds with auto fetch (if you left the field blank) or uses your manual entry.

Why use overrides:
- Lock in official corporate or central bank rates for budgeting consistency.
- Ensure reproducible MYR conversions regardless of when an item is edited later.
- Avoid provider outages for known historical days.

Managing overrides (UI):
- Frontend page: `Settings > FX Overrides` (header link). Path: `/settings/fx`.
- Add or update: Pick a date, currency, and enter the rate (1 CUR = X MYR). Submitting again for same date+currency updates the existing record.
- Delete: Removes the deterministic rate; future items will fall back to live or manual entry.

API Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/fx-overrides | List overrides (optional `?currency=USD` filter, `?date=YYYY-MM-DD`) |
| POST | /api/v1/fx-overrides | Upsert override `{ date: 'YYYY-MM-DD', currency: 'USD', rate: 4.7000 }` |
| DELETE | /api/v1/fx-overrides/:id | Remove override by id |

Notes:
- Date is stored as a DATE (no time). Provide ISO `YYYY-MM-DD`.
- Rate precision is stored up to 8 decimal places; UI input supports 4+ via `step='0.0001'`.
- Overrides are global (not per trip). If you need per-trip variation, extend schema with `tripId`.
- Changing an override does NOT retroactively recompute existing items; edit an item to trigger recalculation if needed.

Migration:
If you added this feature after cloning an earlier version, generate & apply the new table:
```
cd backend
npx prisma migrate dev --name add_fx_rate_override
```
In production (Render / Docker) ensure `prisma migrate deploy` runs on startup.

Troubleshooting overrides:
- Override not applied? Confirm item date (UTC) matches the override date; time zones may shift local times across date boundaries.
- Two overrides same day, same currency? Not possible; composite unique enforces one record.
- Need historical audit? Add fields (e.g. `source`, `note`) to `FxRateOverride` model and create a new migration.

## Printable Itinerary
Print view: `/trips/<id>/print` (frontend). Use browser print (Ctrl/Cmd+P) → Save as PDF if needed.

## Adding Custom Categories
POST /api/v1/categories with `{ "name": "Excursions" }` then assign in item form.

## Potential Enhancements (Future)
- Authentication & per-user separation
- Budget caps per category
- Multi-base currency summarization
- Offline support & optimistic UI
- Automated tests & CI pipeline

## Troubleshooting
| Issue | Fix |
|-------|-----|
| Rates not converting | User-entered rate missing or zero—edit item and supply valid FX rate | 
| Auto FX always failing | Check backend logs for `[fx]` warnings; ensure outbound internet; try manual rate; verify providers reachable via curl | 
| CORS errors | Set `CORS_ORIGIN` to exact frontend origin (e.g. https://yourapp.vercel.app) |
| PDF blank | Some browsers block inline; open in new tab or force download |
| Migration errors | Delete local `dev.db` (if SQLite) or reset Postgres; re-run migrate |
| Backend not starting (compose) | Check `backend` logs; ensure entrypoint ran `prisma migrate deploy`; verify DB reachable |
| Backend exits after DB wait loop | In Docker ensure `DATABASE_URL` host is `db`, not `localhost`; then `docker compose down` and `docker compose up --build` |
| Healthcheck keeps failing | Increase `start_period` in compose or verify port 4000 not in use |
| Schema changes not applied after editing | Create a new migration (`npx prisma migrate dev` locally) then rebuild images |
| Want a clean DB | `docker compose down -v` then `docker compose up --build` |

## Disclaimer
This is a public, anonymous demo application. Do not store sensitive information.


