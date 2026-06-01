FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir uv

COPY pyproject.toml /app/
RUN uv pip install --system -r pyproject.toml

COPY app /app/app

# Mountpoint für Sovaia-Reference (ConfigMap oder Image-Bind).
ENV SSA_REFERENCE_REPO_PATH=/etc/sovaia-reference

CMD ["python", "-m", "app.sync"]
