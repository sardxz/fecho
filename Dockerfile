# syntax=docker/dockerfile:1

# ── Stage 1: build ────────────────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
# --ignore-scripts: evita o postinstall (prisma generate) rodar ANTES do
# schema ser copiado. Geramos o client explicitamente logo abaixo.
RUN npm ci --ignore-scripts

COPY . .
# Gera o Prisma Client (src/generated/prisma) e builda o Next em modo
# standalone. Prisma 7 com driver adapter (pg) não usa engine binário Rust,
# então nada de libssl extra aqui.
RUN npx prisma generate && npm run build

# ── Stage 2: runner ───────────────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Escuta em todas as interfaces do container pra o Nginx do host alcançar.
ENV HOSTNAME=0.0.0.0

# Não roda como root (segurança).
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# O standalone traz só o necessário pra rodar (server.js + deps usadas).
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
