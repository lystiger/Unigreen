# Uni-Green

Uni-Green is a bilingual B2B catalogue and quotation-to-order platform. The
current implementation is the Sprint 0 engineering foundation described in
[`docs/UniGreen_Implementation_Blueprint.md`](docs/UniGreen_Implementation_Blueprint.md).

## Quick start

Requirements: Docker Compose, or Python 3.12 and `uv`.

```bash
cp .env.example .env
docker compose up --build
```

The public site is at <http://localhost:3000> (`/` redirects to `/vi`).

The API is available at <http://localhost:8000>, with:

- OpenAPI UI: <http://localhost:8000/docs>
- liveness: <http://localhost:8000/health/live>
- readiness: <http://localhost:8000/health/ready>

For backend-only development:

```bash
cd backend
uv sync --all-groups
uv run pytest
uv run ruff check .
uv run mypy src
```

Generate the frontend contract:

```bash
cd backend
uv run python scripts/export_openapi.py ../contracts/openapi.json
```

For frontend-only development (requires Node 22):

```bash
cd frontend
npm install
npm run dev
npm run lint && npm run typecheck && npm test
```

## Repository layout

```text
backend/       FastAPI modular monolith and worker
frontend/      Next.js public site (Vietnamese and English)
contracts/     Published machine-readable API contracts
docs/adr/      Architecture decision records
.github/       Pull-request automation and templates
```
