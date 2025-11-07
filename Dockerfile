FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

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

# Install curl for health checks
RUN apk add --no-cache curl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3002

ENV PORT 3002
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]

# ----------- Dev stage (for hot reload in Docker) -----------
FROM node:20-alpine AS dev
WORKDIR /app
ENV NODE_ENV development
ENV NEXT_TELEMETRY_DISABLED 1
# Optional: improves file change detection inside containers
ENV WATCHPACK_POLLING true
ENV CHOKIDAR_USEPOLLING true

# Reuse production deps to avoid network/proxy issues during dev stage build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY . .

EXPOSE 3002
ENV PORT 3002
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "run", "dev", "--", "-p", "3002"]
