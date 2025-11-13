# Backend Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Improve TLS and compatibility in Alpine
RUN apk add --no-cache ca-certificates libc6-compat && update-ca-certificates
# Enable legacy OpenSSL provider to avoid cipher negotiation issues
ENV NODE_OPTIONS=--openssl-legacy-provider

# Install deps using lockfile for reproducibility
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
COPY src ./src

RUN npm run build

FROM node:20-alpine AS prod
WORKDIR /app
COPY --from=base /app/package.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
ENV PORT=5000
EXPOSE 5000
CMD ["node", "dist/index.js"]
