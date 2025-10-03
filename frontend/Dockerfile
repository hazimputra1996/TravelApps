### Dependencies stage (install ALL deps including dev for build)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

### Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

### Production runtime stage (only production deps retained)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node","node_modules/next/dist/bin/next","start"]
