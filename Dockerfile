# syntax=docker/dockerfile:1

FROM node:24-slim AS build
WORKDIR /app
# better-sqlite3 için hazır derleme yoksa kaynak derlemeye düşer
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=5153 \
    TZ=Europe/Istanbul \
    DATABASE_PATH=/app/data/defter.db \
    MIGRATIONS_DIR=/app/migrations
COPY --from=build /app/.output ./.output
COPY --from=build /app/server/db/migrations ./migrations
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 5153
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5153/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", ".output/server/index.mjs"]
