# eam-llm-bridge

Bridge-Service zwischen `architecture-modeler-api` und dem Sovaia DGX-Stack
(via `dgx-gateway`). Folgt dem Bridge-Pattern (teams-bridge, portal-bridge,
smtp-bridge).

## Endpoints

| Endpoint | Iteration-0 | Phase B/C |
|---|---|---|
| `GET /v1/health` | live | live |
| `POST /v1/extract` | Stub (leere Tool-Calls) | DGX-Call mit Intake-Prompt + Tool-Use |
| `POST /v1/gap-analyze` | Stub | DGX-Call mit Gap-Prompt + Tool-Use |
| `POST /v1/clarify` | nicht implementiert | folgt aus Klärungs-Loop |

## Tool-Use-Schema

Definiert in [docs/iteration-0.md](../docs/iteration-0.md). Die 6 Tools:
`add_component`, `add_dependency`, `tag_node`, `register_alias`,
`request_clarification`, `pick_sovaia_node`.

## Prompts

System-Prompts liegen in `app/prompts/` und werden mit dem Reference-Schema
zur Laufzeit kombiniert (Phase B).
