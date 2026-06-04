# architecture-modeler-web — Next.js 15 standalone.
# GHCR-versionierte @efexcon-group/app-shell-*-Deps (kein Sibling-Context nötig).
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate

COPY package.json .npmrc ./
# GHCR-npm-Auth via BuildKit-Secret (Token nicht im Layer).
RUN --mount=type=secret,id=node_auth_token \
    NODE_AUTH_TOKEN="$(cat /run/secrets/node_auth_token)" \
    pnpm install --no-frozen-lockfile

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3002
CMD ["node", "server.js"]
