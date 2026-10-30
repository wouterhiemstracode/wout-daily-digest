# wout.daily: one container serving the API and the built frontend (Google Cloud Run).
FROM mirror.gcr.io/library/node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile \
 && pnpm --filter @workspace/newsletter-digest run build \
 && pnpm --filter @workspace/api-server run build

# The server is bundled by esbuild, so the runtime image needs no node_modules.
FROM mirror.gcr.io/library/node:22-slim
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=build /app/artifacts/api-server/dist artifacts/api-server/dist
COPY --from=build /app/artifacts/newsletter-digest/dist/public artifacts/newsletter-digest/dist/public
COPY --from=build /app/lib/db/migrations lib/db/migrations
USER node
EXPOSE 8080
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
