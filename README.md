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

Product originals and generated variants use the `unigreen-storage` volume.
Only storage keys are persisted; `UNIGREEN_STORAGE_ROOT` selects the mounted
filesystem adapter root and can later be replaced by an S3-compatible adapter.
The one-shot `storage-init` service gives the non-root backend and worker
processes access to that volume before either service starts.

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

Create the first administrator after migrations:

```bash
docker compose run --rm migrate unigreen-create-admin \
  --email admin@example.com \
  --password 'replace-with-a-strong-secret'
```

Staff authentication uses a revocable opaque `HttpOnly` session cookie.
Cookie-authenticated mutations must echo the `ug_csrf` cookie value in the
`X-CSRF-Token` header.

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
