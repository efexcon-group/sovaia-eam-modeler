# architecture-modeler-frontend

React + Vite + React Flow Frontend.

## Lokal

```bash
pnpm install
pnpm dev   # http://localhost:5173 — proxiert /v1 → http://localhost:8000
```

## Build-Modi

```bash
pnpm build                  # Tenant-Build (mit Auth) → dist/
pnpm build:public-player    # Public-Player-Build (read-only) → dist-public/
```

Public-Player wird unter `architektur.sovaia.ch` deployed (Free-Tier).

## Iteration-0-Scope

- Foundation: Vite, Tailwind 4, leerer App-Shell, /v1/health-Ping ✓
- React-Flow-Canvas mit Sovaia-Reference — Phase B
- Story-Player — Phase B
- Chat-Sidekick (Deep Chat) — Phase B
- OIDC-Glue gegen identity-kc — Phase C
