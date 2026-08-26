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

Validate a controlled catalogue manifest, then import it atomically as
staff-only drafts:

```bash
docker compose run --rm \
  --volume "$PWD/backend/examples:/imports:ro" \
  migrate unigreen-import-catalogue \
  --input /imports/catalogue-draft-import.json \
  --check
docker compose run --rm \
  --volume "$PWD/backend/examples:/imports:ro" \
  migrate unigreen-import-catalogue \
  --input /imports/catalogue-draft-import.json
```

The importer always creates `draft` records and has no publication or media
path. The committed example is intentionally empty because no approved product
content sheet or approved pack shots are present. Populate a separate manifest
only from reviewed business data, mount its containing directory read-only in
place of `backend/examples`, record its approval reference, import it, then use
the staff workspace to attach approved media and publish.

Staff authentication uses a revocable opaque `HttpOnly` session cookie.
Cookie-authenticated mutations must echo the `ug_csrf` cookie value in the
`X-CSRF-Token` header.

Quotation requests are stored before an SMTP notification is attempted. For a
Gmail test inbox, set `UNIGREEN_SMTP_USERNAME` to the sending Gmail address and
`UNIGREEN_SMTP_PASSWORD` to a Google App Password in `.env`; do not use the
account's normal password. `UNIGREEN_QUOTATION_RECIPIENT_EMAIL` controls the
notification recipient.

For frontend-only development (requires Node 22):

```bash
cd frontend
npm install
npm run dev
npm run lint && npm run typecheck && npm test
```

## Production deployment

The production Compose overlay requires Docker Compose, a public hostname whose
DNS points at the host, and inbound TCP ports 80 and 443. Caddy provisions and
renews HTTPS certificates automatically.

```bash
cp .env.production.example .env.production
# Replace every example domain, password and mailbox in .env.production.
docker compose --env-file .env.production \
  -f compose.yaml -f compose.production.yaml config --quiet
docker compose --env-file .env.production \
  -f compose.yaml -f compose.production.yaml up -d --build
```

The production overlay exposes only Caddy. Browser API traffic stays on the
site origin and is proxied to the private backend service. Backend startup
rejects non-HTTPS public URLs, missing SMTP settings and disabled SMTP TLS when
`UNIGREEN_ENVIRONMENT=production`.

After the first migration, create the initial administrator and upload approved
catalogue media through the staff workspace. Static fallback images committed
under `frontend/public/images/` remain available until runtime media is attached.

## Repository layout

```text
backend/       FastAPI modular monolith and worker
frontend/      Next.js public site (Vietnamese and English)
contracts/     Published machine-readable API contracts
docs/adr/      Architecture decision records
.github/       Pull-request automation and templates
```
