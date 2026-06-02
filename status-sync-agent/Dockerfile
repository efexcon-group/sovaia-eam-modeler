FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir uv

COPY pyproject.toml /app/
RUN uv pip install --system -r pyproject.toml

COPY app /app/app

# Baked-in Sovaia-Reference (analog architecture-modeler-api, ADR-088).
# CI vendored vor `docker build`:  backend/reference/  →  status-sync-agent/reference/
# Lokal: `cp -r ../backend/reference ./reference` vor dem Build.
COPY reference /etc/sovaia-reference
ENV SSA_REFERENCE_REPO_PATH=/etc/sovaia-reference

CMD ["python", "-m", "app.sync"]
