FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable

# Erst Dep-Manifeste — für Layer-Cache. pnpm-workspace.yaml ist nötig
# damit allowBuilds (esbuild, @tailwindcss/oxide) greift.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# GHCR-npm-Auth für @efexcon-group/app-shell-* via BuildKit-Secret — der Token
# landet NICHT in einem Image-Layer. .npmrc referenziert nur ${NODE_AUTH_TOKEN}.
# --no-frozen-lockfile, bis der Lock mit den versionierten Deps neu erzeugt ist.
RUN --mount=type=secret,id=node_auth_token \
    NODE_AUTH_TOKEN="$(cat /run/secrets/node_auth_token)" \
    pnpm install --no-frozen-lockfile

# Source + Build
COPY . .

# OIDC-Login zur Build-Zeit aktivierbar (Vite bäckt VITE_*-Vars ins Bundle).
# Default false → Login latent aus. CI setzt VITE_AUTH_ENABLED=true (ADR-091).
# Keycloak-URL/Realm/Client bleiben bei den Code-Defaults (intern korrekt);
# leere ENVs würden die ??-Fallbacks im Code überschreiben — daher hier nicht.
ARG VITE_AUTH_ENABLED=false
ENV VITE_AUTH_ENABLED=$VITE_AUTH_ENABLED
# Optionaler IdP-Hint (Alias des Entra-IdP im Realm) → Direkt-Login ohne Dialog.
ARG VITE_KEYCLOAK_IDP_HINT=
ENV VITE_KEYCLOAK_IDP_HINT=$VITE_KEYCLOAK_IDP_HINT

RUN pnpm build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
