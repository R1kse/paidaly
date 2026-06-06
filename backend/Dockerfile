FROM node:20-alpine AS builder
WORKDIR /app

# paths relative to project root (Railway build context = repo root)
COPY backend/package.json ./
RUN npm install

COPY backend/ .
RUN npx prisma generate
RUN npm run build

# ── Production image ──────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

COPY backend/package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY backend/prisma ./prisma

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
