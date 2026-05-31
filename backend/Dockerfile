FROM python:3.12-slim AS base
WORKDIR /app
RUN pip install --no-cache-dir uv

COPY pyproject.toml /app/
RUN uv pip install --system -r pyproject.toml

COPY app /app/app

# Alembic-Migrations folgen wenn Postgres-Persistenz hinzukommt; aktuell
# nutzen wir JSON-Overlays (siehe app/storage/overlay.py).

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
