.PHONY: backend frontend llm-bridge dev-backend dev-frontend dev-llm-bridge test lint helm-lint

# Ports — über Env überschreibbar (z.B. EAM_API_PORT=8003 make dev-backend)
EAM_API_PORT ?= 8000
EAM_LLM_BRIDGE_PORT ?= 8001

backend:
	cd backend && uv sync

frontend:
	cd frontend && pnpm install

llm-bridge:
	cd eam-llm-bridge && uv sync

dev-backend:
	cd backend && uv run uvicorn app.main:app --reload --port $(EAM_API_PORT)

dev-frontend:
	cd frontend && EAM_API_PORT=$(EAM_API_PORT) pnpm dev

dev-llm-bridge:
	cd eam-llm-bridge && uv run uvicorn app.main:app --reload --port $(EAM_LLM_BRIDGE_PORT)

test:
	cd backend && uv run pytest

lint:
	cd backend && uv run ruff check app
	cd frontend && pnpm lint

helm-lint:
	helm lint helm/architecture-modeler -f helm/architecture-modeler/values-internal.yaml
