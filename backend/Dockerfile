FROM python:3.12-slim AS base
WORKDIR /app
RUN pip install --no-cache-dir uv

COPY pyproject.toml /app/
RUN uv pip install --system -r pyproject.toml

COPY app /app/app

# Baked-in Sovaia-Reference. Source-of-Truth ist backend/reference/ in DIESEM Repo
# (git-getrackt) — wird unverändert ins Image gebacken. KEIN CI-Copy aus sovaia-contracts
# (sovaia-contracts/registry/architecture-modeler/ ist ein veralteter Parallelstand).
# Im Container überschreibt EAM_REFERENCE_REPO_PATH=/etc/sovaia-reference den Default.
# Dev ohne Docker: uvicorn nutzt den Default 'reference' (= backend/reference/).
COPY reference /etc/sovaia-reference

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
