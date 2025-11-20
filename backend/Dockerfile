## Backend Dockerfile (switch to Debian-based image to avoid Alpine OpenSSL cipher issues)
FROM node:20-bookworm-slim AS base
WORKDIR /app

# Install CA certificates and update; keep image slim
RUN rm -rf /var/lib/apt/lists/* \
	&& apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates \
	&& apt-get clean \
	&& rm -rf /var/lib/apt/lists/* \
	&& update-ca-certificates

## Use npm bundled with Node image; avoid global upgrades in container

# Enable legacy OpenSSL provider only if some dependency still requires older algorithms
ENV NODE_OPTIONS=--openssl-legacy-provider

# Install deps (include dev deps for TypeScript compiler during build)
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --prefer-offline --no-audit
COPY src ./src

RUN npm run build

FROM node:20-bookworm-slim AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
# Install only production dependencies in final image
RUN npm ci --omit=dev --no-audit \
	&& npm cache clean --force
COPY --from=base /app/dist ./dist
ENV PORT=5000
EXPOSE 5000
CMD ["node", "dist/index.js"]
