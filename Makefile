.PHONY: backend frontend llm-bridge dev-backend dev-frontend dev-llm-bridge test lint helm-lint

backend:
	cd backend && uv sync

frontend:
	cd frontend && pnpm install

llm-bridge:
	cd eam-llm-bridge && uv sync

dev-backend:
	cd backend && uv run uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && pnpm dev

dev-llm-bridge:
	cd eam-llm-bridge && uv run uvicorn app.main:app --reload --port 8001

test:
	cd backend && uv run pytest

lint:
	cd backend && uv run ruff check app
	cd frontend && pnpm lint

helm-lint:
	helm lint helm/architecture-modeler -f helm/architecture-modeler/values-internal.yaml
