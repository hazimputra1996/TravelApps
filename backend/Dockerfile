FROM node:20-alpine
WORKDIR /app

# Install dependencies (need dev for prisma codegen & migrate deploy)
COPY package*.json ./
# Add postgresql-client for pg_isready diagnostics and netcat for alternative checks
RUN apk add --no-cache openssl wget bash postgresql-client netcat-openbsd && npm install

COPY tsconfig.json ./
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
RUN npm run build

COPY docker-entrypoint.sh ./
# Normalize potential CRLF line endings (Windows) to LF to avoid exec format errors
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
