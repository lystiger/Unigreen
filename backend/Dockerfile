FROM python:3.14-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

RUN groupadd --system unigreen \
    && useradd --system --gid unigreen --home-dir /app unigreen

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:0.8.3 /uv /uvx /bin/
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY alembic.ini ./
COPY migrations ./migrations
COPY src ./src
RUN uv sync --frozen --no-dev

RUN chown -R unigreen:unigreen /app
USER unigreen

EXPOSE 8000
CMD ["uvicorn", "unigreen.main:app", "--host", "0.0.0.0", "--port", "8000"]
