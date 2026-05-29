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

## Lokal entwickeln

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
