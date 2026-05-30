.PHONY: backend frontend llm-bridge dev-backend dev-frontend dev-llm-bridge test lint helm-lint up down logs rebuild

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

# ── Docker-Compose (eine Maschine, ein Befehl) ──────────────────────────

up:
	docker compose up --build -d
	@echo ""
	@echo "→ Frontend:  http://localhost:5173/  (oder http://<tailscale-ip>:5173/)"
	@echo "→ Backend:   http://localhost:8003/v1/health"
	@echo "→ Logs:      make logs"

down:
	docker compose down

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-bridge:
	docker compose logs -f bridge

rebuild:
	docker compose up --build -d --force-recreate
