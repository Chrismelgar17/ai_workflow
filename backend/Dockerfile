# Backend Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install
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
