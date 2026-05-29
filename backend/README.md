# architecture-modeler-api

FastAPI-Backend des Sovaia Architecture-Modelers (Iteration 0).

## Lokal starten

```bash
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Smoke-Test:

```bash
curl http://localhost:8000/v1/health
curl http://localhost:8000/v1/reference/schema | head
curl http://localhost:8000/v1/reference/sovaia | head
curl http://localhost:8000/v1/reference/stories
```

## Environment-Variablen

| Variable | Default | Beschreibung |
|---|---|---|
| `EAM_ENV` | local | local \| dev \| staging \| prod |
| `EAM_DATABASE_URL` | postgresql+psycopg://eam:eam@localhost:5432/architecture_modeler | Postgres-DSN (mit pgvector) |
| `EAM_REFERENCE_REPO_PATH` | `../../sovaia-contracts/registry/architecture-modeler` | Pfad zur Sovaia-Reference |
| `EAM_LLM_BRIDGE_URL` | http://localhost:8001 | eam-llm-bridge |
| `EAM_LICENSE_CORE_URL` | http://license-core:8080 | license-core |
| `EAM_OIDC_ISSUER` | https://keycloak.int.efexcon.com/realms/efexcon-group | OIDC-Issuer |
| `EAM_OIDC_AUDIENCE` | architecture-modeler-api | OIDC-Audience |

## Iteration-0-Scope

- `/v1/health`, `/v1/reference/*` ✓ (dieser Stand)
- `/v1/models`, `/v1/nodes`, `/v1/edges`, `/v1/stories` — Phase B
- `/v1/intake/extract`, `/v1/gap/analyze` — Phase B/C
- Alembic-Migrations + RLS — Phase B

Vollständige Spec: [docs/iteration-0.md](../docs/iteration-0.md), ADR-082.
