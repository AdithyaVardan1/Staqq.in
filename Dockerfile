# ─── Staqq Next.js monolith — production image ───────────────────────
# Multi-stage: install deps, build, then a lean runtime from the
# standalone output (output: 'standalone' in next.config.ts).

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Public build-time env (baked into the client bundle). Provided via
# --build-arg in docker-compose; safe values only (anon key / public URLs).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs
# Standalone server + static assets + public dir
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Vendored file: dep — standalone tracing skips it because it's a symlink, so
# copy the real files into the runtime node_modules explicitly.
COPY --from=builder --chown=nextjs:nodejs /app/vendor/panini-connector ./node_modules/panini-connector
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

# ─── Background worker (Angel One -> Redis snapshot, scrapers) ───────
# Reuses the installed node_modules; runs the standalone worker script.
FROM node:20-bookworm-slim AS worker
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY worker ./worker
COPY src/data ./src/data
CMD ["node", "worker/price-worker.mjs"]
