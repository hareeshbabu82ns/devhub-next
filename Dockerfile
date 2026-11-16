# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=24
ARG PNPM_VERSION=9.12.0

# ---------------------------------------------------------------------------
# base: runtime OS layer shared by every stage
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------------------------------------------------------------------------
# pnpm: base + pinned pnpm (kept out of the final image)
# Installed via npm rather than corepack to avoid corepack signature-key failures.
# ---------------------------------------------------------------------------
FROM base AS pnpm
ARG PNPM_VERSION
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
RUN npm install -g pnpm@${PNPM_VERSION} && npm cache clean --force

# ---------------------------------------------------------------------------
# deps: install node_modules (re-runs only when the lockfile changes)
# python3/make/g++ compile native addons (e.g. better-sqlite3) when no prebuild matches.
# ---------------------------------------------------------------------------
FROM pnpm AS deps
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --prefer-offline

# ---------------------------------------------------------------------------
# builder: prisma generate + next build
# ---------------------------------------------------------------------------
FROM pnpm AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run db:gen
RUN --mount=type=cache,id=next-cache,target=/app/.next/cache \
    pnpm run build

# ---------------------------------------------------------------------------
# runner: minimal production image
# ---------------------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# tini: proper PID 1 (signal forwarding, zombie reaping)
# su-exec: entrypoint drops root -> nextjs after fixing data-folder ownership
# curl: for container healthchecks
RUN apk add --no-cache tini su-exec curl && \
    addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nextjs && \
    mkdir -p .next data && \
    chown nextjs:nodejs .next data

# Standalone output traces only the files the server needs
# (see outputFileTracingExcludes in next.config.ts)
COPY --link --from=builder --chown=1001:1001 /app/public ./public
COPY --link --from=builder --chown=1001:1001 /app/.next/standalone ./
COPY --link --from=builder --chown=1001:1001 /app/.next/static ./.next/static
COPY --link --from=builder --chown=1001:1001 /app/src/app/generated ./src/app/generated
COPY --link --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Container starts as root so the entrypoint can fix ownership of the
# (possibly mounted) data folder, then drops to the nextjs user via su-exec.
EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--", "docker-entrypoint.sh"]
CMD ["node", "server.js"]
