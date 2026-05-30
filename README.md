# Sovaia Architecture-Modeler

Lizenzierbares L3-Produkt für Architektur-Visualisierung, Customer-IST/SOLL-Modellierung
und Industry-Storyteller. Aufgebaut auf einem reduzierten Meta-Modell mit C-Level-Tonalität
(Voll-ArchiMate als spätere Add-on-Option).

**Status:** Iteration 0 (Vertical-Slice) — Setup-Phase.

## Repo-Struktur

```
backend/            FastAPI + SQLAlchemy + pgvector
eam-llm-bridge/     Bridge-Service für LLM-Tool-Use (DGX-Stack)
frontend/           React + Vite + React Flow
helm/               Helm-Chart für ArgoCD-Deployment
docs/               Iteration-Specs und Architektur-Notizen
legacy/             v2-v9 HTML-Prototypes (UX-Konzept-Referenz, read-only)
```

## Bezug

- ADR-082 in [sovaia-contracts/architecture/adrs/082-architecture-modeler-licensable-product.md](https://github.com/efexcon-group/sovaia-contracts/blob/main/architecture/adrs/082-architecture-modeler-licensable-product.md)
- Iteration-0-Spec in [docs/iteration-0.md](docs/iteration-0.md)
- Reference-Modell in [sovaia-contracts/registry/architecture-modeler/](https://github.com/efexcon-group/sovaia-contracts/tree/main/registry/architecture-modeler)

## Lokal starten (Empfohlen: Docker Compose)

Voraussetzung: `sovaia-contracts` liegt als Geschwister-Repo daneben
(`~/sovaia-contracts/`). Dann:

```bash
make up
# oder:  docker compose up --build -d
```

URLs:
- Frontend:  `http://localhost:5173/`  (bzw. `http://<tailscale-ip>:5173/`)
- Backend:   `http://localhost:8003/v1/health`

Logs: `make logs`  ·  Stop: `make down`

LLM-Modus per Default `stub` (Template-Vorschläge ohne DGX). Echter
DGX-Call: `.env`-Datei aus `.env.example` ableiten, `EAM_LLM_MODE=dgx`
+ `DGX_LLM_URL` setzen, dann `make rebuild`.

## Alternative: ohne Docker

```bash
# Backend
cd backend && uv sync && uv run uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && pnpm install && pnpm dev

# eam-llm-bridge
cd eam-llm-bridge && uv sync && uv run uvicorn app.main:app --reload --port 8001
```

## Lizenz-Stufen (siehe ADR-082 Anhang A)

| Stufe | Player | IST-Modeling | SOLL | Story-Authoring | Voll-ArchiMate |
|---|---|---|---|---|---|
| Free (Public) | ✓ | — | — | — | — |
| Pro | ✓ | ✓ | ✓ | 5 Stories | — |
| Enterprise | ✓ | ✓ | ✓ | unbegrenzt | ✓ |
