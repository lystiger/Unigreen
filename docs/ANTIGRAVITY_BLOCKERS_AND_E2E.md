# Antigravity launch blockers and browser E2E handoff

## Current baseline

`main` includes the inquiry flow and the P0 deployment fixes through commit
`977740b`. The frontend and backend build, the production containers build from a
clean checkout, database migrations complete, and production readiness reports
PostgreSQL and Redis healthy.

Do not commit `.env`, `.env.production`, browser state, screenshots, traces, or
new image files. Images are intentionally ignored. Approved product media must
be uploaded through the staff workspace and stored on the runtime media volume.

## Remaining launch blockers

### 1. Real production configuration and external services

Owner input is required before deployment:

- choose the production hostname and point DNS to the host;
- replace every example value in `.env.production` with unique secrets;
- configure and verify the SMTP sender, recipient, and domain reputation;
- confirm the persistent PostgreSQL, Redis, Caddy, and media-volume locations;
- confirm inbound TCP 80/443 and outbound SMTP access.

Acceptance: the production overlay starts without example values, HTTPS is
valid, `/health/ready` is healthy, and a test inquiry reaches the approved
mailbox exactly once.

### 2. Approved business content and runtime media

The committed catalogue import example is intentionally empty, and public
address/hotline/web fields remain blank until the business approves them. A
launch environment needs:

- approved Vietnamese and English product/category copy;
- approved public legal identity, address, hotline, and website;
- approved pack options, specifications, SEO titles, and descriptions;
- approved product and factory media uploaded through `/admin`;
- at least one active administrator created after migrations.

Acceptance: every published product has complete bilingual copy and approved
primary media; no placeholder or invented business claim is public.

### 3. Live full-stack browser acceptance

The checked-in Playwright suite is a reliable UI regression suite, but it mocks
the public API. Before launch, run the browser prompts below against a disposable
staging stack with real PostgreSQL, Redis, media storage, SMTP, and seeded
approved catalogue records.

Acceptance: public catalogue, basket, inquiry submission, staff authentication,
media upload, publication, localization, and mobile behavior pass without
unexpected console errors, failed requests, or broken images.

### 4. Release and rollback path

CI validates code and containers but does not publish images or deploy them.
Choose the registry and host, pin a release tag, document database migration
order, and define rollback behavior. Never roll back application code across an
incompatible database migration without an explicit migration plan.

Acceptance: a tagged staging release can be deployed and rolled back by a second
operator using only documented commands.

### 5. Operations

Before accepting real inquiries, configure encrypted backups and a restore test
for PostgreSQL and the media volume, plus uptime/readiness monitoring, exception
reporting, log retention, disk alerts, and certificate-expiry alerts.

Acceptance: a restore drill succeeds and alerts reach the named operator.

## Playwright browser-use setup

Run browser artifacts from a dedicated directory:

```bash
command -v npx >/dev/null 2>&1
PWCLI="${CODEX_HOME:-$HOME/.codex}/skills/playwright/scripts/playwright_cli.sh"
mkdir -p output/playwright/antigravity
cd output/playwright/antigravity

# The bundled wrapper may not have its executable bit set.
pwcli() { bash "$PWCLI" "$@"; }
pwcli --help
pwcli install-browser chromium
export PLAYWRIGHT_CLI_SESSION=unigreen-e2e
```

If the wrapper is unavailable, use the same CLI through `npx`:

```bash
pwcli() { npx --yes --package @playwright/cli playwright-cli "$@"; }
```

Browser rules for every prompt:

1. Use a real browser, not only source inspection or HTTP requests.
2. Open the page, take a snapshot, and use element refs from that snapshot.
3. Take a new snapshot after navigation, modal changes, or major DOM updates.
4. Use a named session so basket and authentication state persist intentionally.
5. Capture console warnings, failed network requests, a trace, and screenshots.
6. Store artifacts only under `output/playwright/<flow>/`.
7. Do not use `eval` or `run-code` to bypass inaccessible UI controls.
8. Test against staging or local Compose, never mutate production records.

The repository regression suite remains a required baseline:

```bash
cd frontend
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=mobile
```

## Copy-ready Antigravity prompts

### Prompt 1 — public bilingual journey

```text
Work in /home/lystiger/projects/Unigreen. Perform a read-only browser E2E audit
of the running Uni-Green site with Playwright CLI browser use. Do not edit code
until you have produced evidence for a defect.

Use the browser workflow in docs/ANTIGRAVITY_BLOCKERS_AND_E2E.md. Start tracing,
open the local or staging base URL in a headed browser, snapshot before every
interaction, and refresh the snapshot after every navigation. Verify:

1. / redirects to /vi and the document language is Vietnamese.
2. Vietnamese and English language switches preserve the route family.
3. Landing, catalogue, and each accessible product detail route render.
4. Every visible image loads; inspect requests for 404/5xx responses.
5. Catalogue search, category filter, sort, pagination, and retry states work.
6. Navigation, footer, metadata-facing titles, and unknown-locale 404 behavior
   are coherent in both languages.
7. There are no unexpected browser console errors or failed API requests.

Repeat at 1440x900 and 390x844. Save desktop/mobile screenshots and the trace
under output/playwright/public-journey/. Report a table with route, viewport,
result, evidence path, and defect. If a defect is found, identify the narrowest
responsible file, patch only that defect, rerun the failed flow, then run the
nearest automated test.
```

### Prompt 2 — real basket and inquiry submission

```text
Use Playwright CLI in a real browser against a disposable Uni-Green staging or
local Compose stack. Do not mock network requests. Confirm that at least one
approved published product with a pack option exists; if it does not, stop and
report the missing seed-data prerequisite instead of inventing content.

Start a trace and use fresh snapshots/element refs throughout. In English, add a
published product from the catalogue, add it again, and verify one basket line
increments rather than duplicates. Select a pack option, change quantity, add a
line note, reload, and prove the basket persists. Open the full basket, continue
to the real inquiry form, enter clearly marked E2E contact data, and submit once.

Verify the success UI returns a non-empty reference, the basket clears only
after success, and the network panel shows exactly one successful inquiry POST
with an Idempotency-Key. Confirm the approved test mailbox receives exactly one
notification and the reference matches. Repeat the navigation path in
Vietnamese without sending a second inquiry. Test required-field validation and
an unpublished-product reconciliation case if disposable seed data permits it.

Save trace, screenshots, request/response evidence with secrets redacted, and a
result table under output/playwright/inquiry-flow/. Never print passwords,
cookies, CSRF tokens, SMTP credentials, or full customer data. Patch only proven
code defects, then rerun the browser flow and relevant unit/E2E tests.
```

### Prompt 3 — staff catalogue, media, and publication

```text
Run this only against a disposable local or staging database. Obtain a dedicated
E2E staff account through an approved secure channel; do not place credentials
in commands, logs, screenshots, Git, or browser artifacts.

Use Playwright CLI browser use with tracing and fresh snapshots. Log in through
/admin/login and verify the session uses cookies. Create a uniquely prefixed
draft category and product using approved test copy, add bilingual fields and a
pack option, and verify the draft is absent from the public catalogue. Upload an
approved small test image through the staff media UI; do not copy it into
frontend/public. Verify preview, alt text, ordering, and primary-media selection.
Publish the record, then open a separate browser session and prove it appears in
both public locales with working media and pack options. Unpublish it and verify
the public record disappears while an existing basket line becomes unavailable.

Inspect console and network failures at each transition. Save redacted evidence
under output/playwright/staff-publication/. Report every created record ID so an
operator can clean up. Do not delete or modify pre-existing records. If cleanup
is requested, resolve exact E2E-prefixed IDs first and remove only those records.
```

### Prompt 4 — responsive, accessibility, and failure states

```text
Use Playwright CLI browser use to exercise Uni-Green at 390x844, 768x1024, and
1440x900. Use snapshots as the accessibility tree and interact by semantic refs.
Do not use eval/run-code to force controls.

Verify keyboard navigation, visible focus, Escape behavior for the basket
drawer, focus return after closing, form labels, error announcements, empty
states, loading states, long Vietnamese copy, and 200% browser zoom. Toggle the
browser offline for catalogue and inquiry screens, verify actionable recovery,
restore online mode, and retry. Confirm the mobile add-to-basket action opens the
drawer while desktop does not interrupt navigation.

Capture per-viewport screenshots, console output, failed requests, and a trace
under output/playwright/responsive-failures/. Report severity, exact route,
viewport, reproduction steps, expected/actual behavior, and artifact path. Make
only evidence-backed fixes and rerun both the failed browser scenario and the
mobile Playwright project.
```

### Prompt 5 — production release smoke

```text
Validate a disposable production-like deployment of Uni-Green. Never use the
example passwords or example.com values, and never expose secret values in the
report. First run all repository quality gates and validate:

docker compose --env-file .env.production \
  -f compose.yaml -f compose.production.yaml config --quiet

Deploy a tagged build through the documented production overlay. Confirm Caddy
serves valid HTTPS and that backend/web ports are not directly public. Use a
headed Playwright CLI browser against the HTTPS hostname, start tracing, and run
the public journey plus one approved test inquiry. Inspect security-sensitive
cookie flags without recording cookie values, same-origin API routing, media
URLs, console output, and network responses. Verify /health/ready separately and
confirm PostgreSQL, Redis, media, and Caddy volumes survive an application
container restart.

Save redacted artifacts under output/playwright/release-smoke/. Report the image
tag, commit SHA, migration result, health result, browser result, mail result,
rollback command, and unresolved risk. Do not declare launch-ready unless every
acceptance item in this document has direct evidence.
```

## Required final report format

Antigravity should finish each run with:

- environment and commit SHA tested;
- commands and browser session used;
- pass/fail/blocked for every acceptance item;
- exact reproduction steps for failures;
- console/network findings with secrets redacted;
- artifact paths;
- files changed and verification rerun, if any;
- external decision or credential still required.
