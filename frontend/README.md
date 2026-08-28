# Uni-Green web and staff catalogue

Next.js App Router, TypeScript, Tailwind CSS and TanStack Query. The public
catalogue is bilingual at `/vi` and `/en`; the protected staff workspace is at
`/admin`.

## Develop

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Run the complete stack from the repository root with:

```bash
docker compose up --build
```

The web app uses the backend API as its only catalogue source. There is no
static product fallback: unavailable APIs produce an explicit retry state, and
only published products with approved primary media can appear publicly.

## Quality commands

| Command                | Purpose                                      |
| ---------------------- | -------------------------------------------- |
| `npm run build`        | Production Next.js build                     |
| `npm run lint`         | ESLint                                       |
| `npm run typecheck`    | TypeScript without emit                      |
| `npm run format:check` | Prettier verification                        |
| `npm test`             | Vitest component and unit tests              |
| `npm run test:e2e`     | Desktop and mobile Playwright acceptance     |
| `npm run api:types`    | Generate types from the committed API schema |

`lib/api/schema.d.ts` is generated from
[`contracts/openapi.json`](../contracts/openapi.json). CI regenerates both
artifacts and fails if either changes.

## Publication model

- Public routes read only `/api/v1/public/*`.
- Staff authentication uses secure cookies and CSRF protection; credentials
  are never stored in browser storage.
- Catalogue write and publication controls follow backend permissions.
- Pending media is previewed only through authenticated staff routes.
- Quotation requests use the basket-backed public inquiry endpoint and return a
  persisted reference number before email notification is attempted.

Product images must be uploaded in the staff workspace. The backend validates,
normalizes and stores controlled variants on the mounted media volume. Source
files in `docs/images/` are reference material only and are never imported or
published without explicit approval.
