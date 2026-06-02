FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable

# Erst Dep-Manifeste — für Layer-Cache. pnpm-workspace.yaml ist nötig
# damit allowBuilds (esbuild, @tailwindcss/oxide) greift.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

# Source + Build
COPY . .

# OIDC-Login zur Build-Zeit aktivierbar (Vite bäckt VITE_*-Vars ins Bundle).
# Default false → Login latent aus. CI setzt VITE_AUTH_ENABLED=true (ADR-091).
# Keycloak-URL/Realm/Client bleiben bei den Code-Defaults (intern korrekt);
# leere ENVs würden die ??-Fallbacks im Code überschreiben — daher hier nicht.
ARG VITE_AUTH_ENABLED=false
ENV VITE_AUTH_ENABLED=$VITE_AUTH_ENABLED

RUN pnpm build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
