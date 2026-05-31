FROM python:3.12-slim AS base
WORKDIR /app
RUN pip install --no-cache-dir uv

COPY pyproject.toml /app/
RUN uv pip install --system -r pyproject.toml

COPY app /app/app

# Baked-in Sovaia-Reference. CI kopiert vor `docker build`:
#   sovaia-contracts/registry/architecture-modeler/. → backend/reference/
# Lokal docker build: backend/reference/ muss vorher manuell befüllt sein.
# Dev ohne Docker: uvicorn nutzt EAM_REFERENCE_REPO_PATH (default
# zeigt aufs Geschwister-Repo) — kein bake nötig.
COPY reference /etc/sovaia-reference

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
