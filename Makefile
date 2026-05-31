.PHONY: backend frontend llm-bridge dev-backend dev-frontend dev-llm-bridge test lint helm-lint helm-render helm-diff sync-reference

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

# ── Reference-Sync (Dev-Phase einfach gehalten) ─────────────────────────
# Quelle: Geschwister-Repo ../sovaia-contracts/registry/architecture-modeler/
# Ziel:   backend/reference/ (committet, ins Image gebaked)
#
# Workflow bei Reference-Änderungen:
#   1. sovaia-contracts: ändern + push
#   2. cd sovaia-eam-modeler && make sync-reference
#   3. git add backend/reference && git commit -m "sync reference" && git push
#   → CI baut Image → Image-Updater bumpt → Pod-Restart.
#
# Pre-Go-Live: auf GitHub-App-basierte Cross-Repo-CI umstellen.

sync-reference:
	@if [ ! -d ../sovaia-contracts/registry/architecture-modeler ]; then \
		echo "❌ ../sovaia-contracts nicht gefunden — klone es als Geschwister-Repo"; \
		exit 1; \
	fi
	rm -rf backend/reference
	mkdir -p backend/reference
	cp -r ../sovaia-contracts/registry/architecture-modeler/. backend/reference/
	@echo "✓ backend/reference/ synchronisiert"
	@ls backend/reference/ | head

# ── Helm-Diagnostics ────────────────────────────────────────────────────

helm-render:
	helm template am ./helm/architecture-modeler \
		-f helm/architecture-modeler/values.yaml \
		-f helm/architecture-modeler/values-internal.yaml

helm-diff:
	helm diff upgrade am ./helm/architecture-modeler \
		-f helm/architecture-modeler/values.yaml \
		-f helm/architecture-modeler/values-internal.yaml -n platform
