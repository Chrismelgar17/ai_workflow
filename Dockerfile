FROM node:20-bookworm-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
# Install CA certs (already present in bullseye-slim but ensure updated) and curl for potential health checks
RUN rm -rf /var/lib/apt/lists/* \
	&& apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates curl \
	&& apt-get clean \
	&& rm -rf /var/lib/apt/lists/* \
	&& update-ca-certificates

## Use npm bundled with Node image to avoid global upgrade issues

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit
# Proactively ensure SWC native binary exists in the layer to avoid remote download during next build
RUN npm install --no-audit --no-fund @next/swc-linux-x64-gnu@14.2.33 || true

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install curl for health checks (robust against mirror/hash issues)
RUN set -eux; \
		rm -rf /var/lib/apt/lists/*; \
		for i in 1 2 3 4 5; do \
			apt-get update -o Acquire::Retries=3 -o Acquire::CompressionTypes::Order::=gz -o Acquire::http::No-Cache=true -o Acquire::Check-Valid-Until=false && \
			apt-get install -y --no-install-recommends curl ca-certificates && break || \
			(echo "apt failed on attempt $i, retrying..."; rm -rf /var/lib/apt/lists/*; sleep 3); \
		done; \
		apt-get clean; \
		rm -rf /var/lib/apt/lists/*; \
		update-ca-certificates

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Include server directory for vendor chunks (e.g. @tanstack) not present in standalone root
COPY --from=builder --chown=nextjs:nodejs /app/.next/server ./.next/server

USER nextjs

EXPOSE 3002

ENV PORT 3002
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]

# ----------- Dev stage (for hot reload in Docker) -----------
FROM base AS dev
WORKDIR /app
ENV NODE_ENV development
ENV NEXT_TELEMETRY_DISABLED 1
# Optional: improves file change detection inside containers
ENV WATCHPACK_POLLING true
ENV CHOKIDAR_USEPOLLING true

# Reuse production deps (already includes @next/swc-linux-x64-gnu) for consistent SWC
COPY package.json package-lock.json* ./
# Fresh install on Linux to pick up correct optional SWC binary (lock file built on Windows omits linux targets)
RUN npm install --no-audit --no-fund
RUN npm install --no-audit --no-fund @next/swc-wasm-nodejs@14.2.33 || true
COPY . .

EXPOSE 3002
ENV PORT 3002
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "run", "dev", "--", "-p", "3002"]
