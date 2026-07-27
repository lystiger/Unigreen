# Uni-Green Sprint 2 — Inquiry Basket and Staff Inquiry Workspace (Frontend)

Owner: Claude Code (frontend)
Companion: Codex/backend Sprint 2 (inquiry persistence, reference generation,
idempotency, rate limiting, acknowledgement email job)
Predecessor: `docs/UniGreen_Sprint_1_Catalogue.md`
Blueprint reference: section 15, "Sprint 2 — Inquiry and customer records"

---

## 1. Sprint outcome

A visitor can collect products from the catalogue into a persistent inquiry
basket, submit a structured inquiry in one bilingual multi-step form, and
receive a reference number on screen and by email. Staff can list, filter,
open, assign, annotate and re-status those inquiries in the admin portal.

The frontend is the only consumer of the new inquiry API. It codes against the
published contract, not against a running backend.

---

## 2. Sprint boundaries

### In scope

- Persistent client-side inquiry basket with revalidation against the catalogue
- Basket drawer and full basket page
- Four-step inquiry form with per-step validation and URL-addressable steps
- Idempotent submission with retry that does not duplicate records
- Rate-limit, validation-error and network-failure states
- Confirmation screen carrying the inquiry reference
- Staff inquiry list with filters, pagination and saved query state in the URL
- Staff inquiry detail with items, customer panel, assignment, notes, status
- Sprint 1 remediation items in section 3

### Explicitly out of scope

- Quotation generation, pricing, VAT, discounts, PDF (Sprint 3)
- Customer-facing accounts, login or order tracking (Sprint 4+)
- Customer PO upload (Sprint 4)
- Excel export (Sprint 5)
- Any change to product, category, media or specification surfaces
- Any new colour, type or radius token

---

## 3. Sprint 1 carry-over remediation (blocking preflight)

These are regressions against the Sprint 1 design contract found in the current
`main`. All five must land before any inquiry screen is built, because Sprint 2
roughly doubles the interactive surface and each defect would be copied forward.

### P1-01 — Restore the 44px minimum touch target

`components/ui/Button.tsx` `SIZE.md` is `px-4 py-2 text-body`, which computes to
roughly 41.6px tall. It fails WCAG 2.5.8 and is the default size used across the
site. The pagination controls in `CataloguePage.tsx` have the same problem.

- [ ] `SIZE.md` becomes `min-h-11 px-4 text-body`
- [ ] `SIZE.lg` becomes `min-h-12 px-6 text-lead`
- [ ] Every bare `<button>` and `<a>` styled as a control uses `min-h-11`
- [ ] A vitest assertion covers the computed class list of both sizes

### P1-02 — Remove `uppercase` from localized strings

Ten files apply `uppercase` to eyebrow text. Combined with `text-eyebrow`'s
0.12em tracking this collides stacked Vietnamese diacritics against the cap
height — `Danh mục đã xuất bản`, `Sản phẩm`, `Thông số kỹ thuật`.

- [ ] `uppercase` removed from all localized eyebrow and label text
- [ ] Emphasis retained via `font-mono` + `tracking-widest` + `text-brand-green`
- [ ] `uppercase` permitted only on locale codes (`vi` / `en`) and SKU strings
- [ ] An eslint rule or a repo-wide grep gate in CI prevents reintroduction

### P1-03 — Consolidate translations into `lib/i18n.ts`

`CataloguePage.tsx` and `ProductDetailPage.tsx` each declare a local
`const COPY = { vi, en }`. There are now three sources of translation truth.

- [ ] Both local `COPY` objects folded into the `Dictionary` interface
- [ ] Components receive copy via props or `getDictionary(locale)` only
- [ ] `tests/i18n.test.ts` extended to assert vi and en key parity across the
      whole `Dictionary`, recursively, so a missing key fails CI

### P1-04 — Document and harden the raw `<img>` decision

Three call sites use `<img>` with `@next/next/no-img-element` disabled. This is
defensible — media URLs are runtime values from the API — but it is currently
undocumented and drops the loading and decoding hints `next/image` provides.

- [ ] Write `docs/adr/0004-runtime-media-without-next-image.md`
- [ ] Every `<img>` sets `loading="lazy"`, `decoding="async"`, `width`, `height`
- [ ] The above-the-fold product detail hero image sets `fetchPriority="high"`
      and `loading="eager"`

### P1-05 — Announce async result changes

`CataloguePage` swaps grid content after a debounced search with no
announcement, so screen reader users get no feedback that results changed.

- [ ] Result count rendered in a `role="status"` `aria-live="polite"` region
- [ ] Region announces count and active filters in the active locale
- [ ] Same pattern reused by the staff inquiry list in this sprint

**Gate:** `npm run lint && npm run typecheck && npm test` passes, and the P1
items ship as PR 1 before PR 2 opens.

---

## 4. Frontend architecture decisions

### 4.1 The basket is client-only and versioned

There are no customer accounts in Sprint 2, so the basket lives in
`localStorage` under a single versioned key. It is never sent anywhere except
as the `items` array of a submission.

```
key:   ug.basket.v1
value: { version: 1, updatedAt: ISO8601, items: BasketItem[] }
```

Rules:

- Reading is deferred to an effect after mount. The first server render and the
  first client render must produce identical markup — no hydration mismatch.
- Unknown or higher `version` values are discarded, not migrated.
- Hard cap of 40 line items and 32KB serialized. Exceeding either rejects the
  add with a toast, it does not silently truncate.
- A corrupt or unparseable value is discarded and the basket resets empty.

### 4.2 The basket revalidates against the published catalogue

A product added last week may since have been unpublished, renamed or had its
SKU changed. On basket mount and again on entering the form, the basket calls
the public product endpoint for its stored ids and reconciles.

- Product still published → refresh name, SKU, image, MOQ from the response
- Product now missing or unpublished → mark the line `unavailable`, show it
  struck through with a removal action, exclude it from submission
- Endpoint fails → keep stored values, show a non-blocking staleness notice,
  allow submission (the backend revalidates authoritatively)

The stored snapshot is a cache for display. It is never the source of truth.

### 4.3 Submission is idempotent by construction

An `Idempotency-Key` UUIDv4 is generated when the user first reaches the review
step and persisted alongside the basket.

- The same key is reused for every retry of that submission
- The key rotates only after a `201`, or when the user edits any field after a
  terminal failure
- On `201` the basket and the key are cleared in the same commit
- A duplicate `POST` with the same key must render the confirmation screen, not
  an error — the backend returns the original record

This is the single most likely source of duplicate customer records. It gets an
explicit test.

### 4.4 Form steps are URL-addressable

The form lives at `/{locale}/inquiry` with `?step=items|company|delivery|review`.
Browser back moves between steps rather than leaving the form. Step state is a
`useReducer` store; a failed submission never clears it.

### 4.5 Status colour never uses brand green

Extend the existing `status` ramp in `tailwind.config.ts`. Green remains brand
and primary action only. Every badge pairs colour with an icon and a text label.

| Inquiry status | Token | Rationale |
|---|---|---|
| `new` | `status.pending` `#B87514` | needs attention |
| `assigned` | `status.accepted` `#1B7FA8` | owned, in flight |
| `in_progress` | `status.accepted` `#1B7FA8` | owned, in flight |
| `closed` | `status.draft` `#8A968F` | inert |
| `spam` | `status.rejected` `#C0392B` | destructive |

`assigned` and `in_progress` share a hue and are distinguished by label and
icon, never by colour alone.

---

## 5. User stories

| ID | As a | I want | So that |
|---|---|---|---|
| S2-01 | buyer | to add products to a basket from the catalogue and detail pages | I can request pricing on a full order, not one SKU |
| S2-02 | buyer | my basket to survive a reload | I can gather requirements over several sessions |
| S2-03 | buyer | to enter quantity in cartons or 40HC containers per line | my request matches how the mill quotes |
| S2-04 | buyer | to request OEM/private label on the inquiry | I do not have to send a separate email |
| S2-05 | buyer | a reference number on screen and by email | I can follow up |
| S2-06 | buyer | to retry a failed submission safely | I do not create duplicate records |
| S2-07 | staff | to filter inquiries by status, assignee and date | I can work a queue |
| S2-08 | staff | to open an inquiry and see every line item with specs | I can price it without opening the catalogue |
| S2-09 | staff | to assign an inquiry and leave notes | the team has one record of the conversation |
| S2-10 | staff | to mark an inquiry spam | the queue stays clean |

---

## 6. Client state model

```ts
// lib/basket/types.ts
export type QuantityUnit = "cartons" | "containers_40hc";

export interface BasketItem {
  readonly productId: string;
  readonly slug: string;
  /** Display cache, refreshed on revalidation. Never authoritative. */
  readonly sku: string;
  readonly name: string;
  readonly imageUrl: string | null;
  readonly minOrderCartons: number | null;
  readonly quantity: number;
  readonly unit: QuantityUnit;
  readonly note: string | null;
  readonly availability: "available" | "unavailable" | "unverified";
}

export interface BasketState {
  readonly version: 1;
  readonly updatedAt: string;
  readonly items: readonly BasketItem[];
}
```

Actions: `add`, `remove`, `setQuantity`, `setUnit`, `setNote`, `reconcile`,
`clear`. Implemented as a reducer in `lib/basket/reducer.ts` with no React
dependency, so it is unit-testable in isolation.

Quantity rules:

- Integer, minimum 1, maximum 99,999
- Below `minOrderCartons` shows a warning, not a block — the mill decides
- Non-numeric input is rejected on change, not on blur

---

## 7. API contract the frontend codes against

**Gate: do not begin PR 3 until `contracts/openapi.json` contains these paths
and `npm run api:types` regenerates `lib/api/schema.d.ts` cleanly.** If the
published contract differs from what follows, the contract wins and this
section is amended by PR.

### Public

```
POST /api/v1/public/inquiries
  Headers: Idempotency-Key: <uuid4>
  Body:
    locale, company { name, tax_code?, country, city?, website? },
    contact { full_name, email, phone, role? },
    delivery { incoterm?, destination, target_date?, notes? },
    items[] { product_id, quantity, unit, note? },
    oem_requested: boolean,
    requirements?: string,
    anti_spam { honeypot: string, elapsed_ms: number }
  201 -> { reference, status, submitted_at }
  400 -> ErrorEnvelope with field_errors keyed by dotted path
  409 -> ErrorEnvelope INQUIRY_ITEMS_UNAVAILABLE, field_errors["items"]
  429 -> ErrorEnvelope RATE_LIMITED, Retry-After header in seconds
```

`field_errors` keys are dotted paths (`contact.email`, `items.2.quantity`) so
the client can focus the offending control and jump to its step.

### Staff (cookie session + `X-CSRF-Token`, per Sprint 1)

```
GET   /api/v1/staff/inquiries?status=&assignee=&q=&from=&to=&page=&page_size=
GET   /api/v1/staff/inquiries/{inquiry_id}
PATCH /api/v1/staff/inquiries/{inquiry_id}          { status }
POST  /api/v1/staff/inquiries/{inquiry_id}/assign   { staff_user_id | null }
POST  /api/v1/staff/inquiries/{inquiry_id}/notes    { body }
GET   /api/v1/staff/customers?q=&page=&page_size=
GET   /api/v1/staff/customers/{customer_id}
```

Reference format is backend-owned. The frontend treats it as an opaque string
and never parses or generates it.

---

## 8. Route map

| Route | Rendering | Notes |
|---|---|---|
| `/{locale}/inquiry` | client | form, `?step=` addressable |
| `/{locale}/inquiry/confirmation` | client | reads reference from router state; direct visit without state redirects to `/{locale}/inquiry` |
| `/vi/gio-hang` · `/en/basket` | client | full basket page; mirrors the Sprint 1 localized-slug pattern with cross-locale redirects |
| `/admin/inquiries` | client | list, filters in URL |
| `/admin/inquiries/[id]` | client | detail |
| `/admin/customers` | client | list |
| `/admin/customers/[id]` | client | detail panel |

Localized slug pairs follow `lib/routes.ts`. Add `basketPath(locale)` and
`inquiryPath(locale)` there — no route string is inlined in a component.

---

## 9. Component inventory

### New — public

| Component | Responsibility |
|---|---|
| `components/basket/BasketProvider.tsx` | context + reducer + persistence effect |
| `components/basket/AddToBasketControl.tsx` | quantity, unit, add action; used on card and detail |
| `components/basket/BasketDrawer.tsx` | slide-over summary, focus trap, Esc to close |
| `components/basket/BasketLineRow.tsx` | one line, quantity control, remove, availability |
| `components/basket/BasketBadge.tsx` | header count, `aria-live` on change |
| `components/inquiry/InquiryStepper.tsx` | step indicator, `aria-current="step"` |
| `components/inquiry/StepItems.tsx` | review and adjust lines |
| `components/inquiry/StepCompany.tsx` | company and contact fields |
| `components/inquiry/StepDelivery.tsx` | destination, incoterm, date, OEM, requirements |
| `components/inquiry/StepReview.tsx` | read-only summary, submit |
| `components/inquiry/SubmitResult.tsx` | success, rate-limited, unavailable-items, network states |

### New — admin

| Component | Responsibility |
|---|---|
| `components/admin/InquiryTable.tsx` | rows, sort, empty, loading, error |
| `components/admin/InquiryFilters.tsx` | status, assignee, date range, search |
| `components/admin/InquiryDetail.tsx` | header, items, customer panel |
| `components/admin/AssignControl.tsx` | assignee combobox |
| `components/admin/NoteThread.tsx` | note list + composer |
| `components/admin/StatusControl.tsx` | status transition, confirm on `spam` |

### New — shared

| Component | Responsibility |
|---|---|
| `components/ui/Field.tsx` | label + control + hint + error, wired `aria-describedby` / `aria-invalid` |
| `components/ui/Toast.tsx` | non-blocking feedback; replaces any `alert()` |
| `components/ui/EmptyState.tsx` | extracted from `ProductGrid`, reused by four new surfaces |

### Reused unchanged

`Button`, `SectionHeader`, `SpecStrip`, `ProductCard`, `AsyncState`,
`StatusBadge`, `AdminShell`, `SiteHeader`, `SiteFooter`.

`StatusBadge` gains inquiry statuses via props. It is not forked.

---

## 10. Screen specifications

### 10.1 Add to basket

Replaces the disabled "coming soon" button on `ProductDetailPage`.

- Quantity input defaults to `minOrderCartons` when known, otherwise 1
- Unit select defaults to cartons
- Adding an already-present product increments rather than duplicating, and
  the toast says so
- Feedback within 100ms; the drawer does not auto-open on desktop, it does on
  mobile where the header badge is less visible

### 10.2 Basket drawer

- Focus moves to the drawer heading on open and returns to the trigger on close
- `Esc` closes; background scroll locked; focus trapped
- Empty state explains what the basket is for and links to the catalogue
- Footer shows line count and a primary "Request quotation" action

### 10.3 Inquiry form

Four steps. Each step validates only its own fields on advance. The review step
re-runs full validation before enabling submit.

- Required: company name, country, contact name, email, phone, destination, and
  at least one available item
- Email and phone validated permissively — international formats must pass;
  reject only what is structurally impossible
- Server `field_errors` map to controls by dotted path, focus the first one, and
  navigate to its step automatically
- The submit button shows a spinner and is disabled while in flight
- A failed submission never clears entered data
- Honeypot field is visually hidden, `tabindex="-1"`, `autocomplete="off"`, and
  named plausibly; `elapsed_ms` is measured from first form interaction

### 10.4 Confirmation

- Reference displayed in mono at `text-h2`, with a copy action
- States plainly that a confirmation email is on its way and to check spam
- Offers "start another inquiry" and a link back to the catalogue
- Basket is already cleared at this point

### 10.5 Staff inquiry list

- Filters serialize to the URL so a queue view is shareable
- Default sort: newest first, `new` status pinned above the fold
- Row shows reference, company, item count, status, assignee, submitted date
- Result count in an `aria-live` region (reuses P1-05)
- Empty state distinguishes "no inquiries yet" from "no results for filters",
  and the second offers a clear-filters action

### 10.6 Staff inquiry detail

- Left: line items with SKU, quantity, unit, per-line note, and a link to the
  product; a line whose product was later unpublished is labelled, not hidden
- Right: customer panel — company, contact, destination, incoterm, OEM flag
- Assignment and status controls are optimistic with rollback on failure
- Notes append newest-last; the composer keeps its draft across a failed post
- `spam` requires a confirmation dialog and states that it is reversible

---

## 11. Required states

Every list, form and detail surface implements all six. A screen missing one is
not done.

| State | Requirement |
|---|---|
| Loading | Skeleton matching final layout; no blank region, no spinner-only |
| Empty | Explains the cause and offers the next action |
| Error | `role="alert"`, human message, request id, retry action |
| Partial | Missing optional fields degrade; missing media falls back to the label |
| Success | Confirms, then gets out of the way |
| Disabled | Reduced opacity, `cursor-not-allowed`, and a reason via `title` or hint |

Additional states unique to this sprint: `rate-limited` (shows the `Retry-After`
countdown and keeps the form intact) and `items-unavailable` (returns the user
to step one with the offending lines flagged).

---

## 12. Accessibility and localization rules

- All new copy lives in `lib/i18n.ts`. No `const COPY` in a component.
- No `uppercase` on Vietnamese strings (P1-02).
- Every input has a visible label via `Field`. Placeholder-only is a defect.
- Errors are associated with `aria-describedby` and `aria-invalid`.
- The stepper marks the active step with `aria-current="step"`.
- The drawer traps focus and restores it.
- Vietnamese copy is written first; English is the translation. Buttons and
  table headers are laid out against the Vietnamese string length.
- Keyboard-only completion of the full submit path is an acceptance criterion,
  not a review comment.

---

## 13. Testing plan

### Unit — vitest

- [ ] `basket/reducer` — add, increment-on-duplicate, remove, clamp, cap at 40
- [ ] `basket/persistence` — corrupt value resets, unknown version discarded,
      SSR-safe first render
- [ ] `basket/reconcile` — unavailable marking, display-cache refresh
- [ ] `Field` — `aria-describedby` and `aria-invalid` wiring
- [ ] Idempotency key lifecycle — reused on retry, rotated after 201 and edit
- [ ] `Dictionary` vi/en key parity, recursive (P1-03)
- [ ] `Button` size classes contain `min-h-11` / `min-h-12` (P1-01)

### Component — testing-library

- [ ] Step validation blocks advance and focuses the first invalid control
- [ ] Server `field_errors` navigate to the correct step and focus the control
- [ ] `429` renders the countdown and preserves all entered data
- [ ] Drawer focus trap and restore
- [ ] Inquiry list empty-vs-filtered-empty states differ

### E2E — playwright, `tests/e2e/sprint-two.spec.ts`

- [ ] Add two products from catalogue and one from detail; reload; basket intact
- [ ] Complete the form and reach confirmation with a reference
- [ ] Submit twice with a forced network failure between; exactly one record
- [ ] Keyboard-only path from catalogue to confirmation
- [ ] Staff logs in, filters to `new`, opens the inquiry, assigns it, adds a
      note, sets `in_progress`; list reflects all three
- [ ] Vietnamese and English both complete the full path

---

## 14. PR plan

| PR | Title | Contents | Gate |
|---|---|---|---|
| 1 | Sprint 1 remediation | P1-01 … P1-05 | lint, typecheck, test, existing e2e |
| 2 | Basket state and persistence | reducer, provider, persistence, reconcile, unit tests | unit tests green, no UI yet |
| 3 | Basket UI | control, drawer, badge, page, routes | contract published, types regenerated |
| 4 | Inquiry form | four steps, `Field`, `Toast`, validation, idempotency | component tests green |
| 5 | Submission and confirmation | API wiring, all failure states, confirmation | e2e submit path green |
| 6 | Staff inquiry workspace | list, filters, detail, assign, notes, status | e2e staff path green |
| 7 | Acceptance | full e2e suite, docs, ADR 0004 | all gates green |

Each PR is independently revertable. PR 3 does not open before the contract
gate in section 7 clears.

---

## 15. File ownership

### Claude Code may edit

```
frontend/app/**
frontend/components/**
frontend/lib/**
frontend/tests/**
frontend/tailwind.config.ts      (status ramp additions only)
docs/adr/0004-*.md
docs/UniGreen_Sprint_2_Inquiry_Frontend.md
```

### Claude Code must not edit

```
backend/**
contracts/openapi.json           (generated by the backend exporter)
compose.yaml
.github/**
frontend/lib/api/schema.d.ts     (generated by npm run api:types)
```

### Coordinated — requires agreement before change

```
frontend/lib/api/client.ts       (shared error and CSRF handling)
frontend/lib/i18n.ts             (both agents add keys)
frontend/lib/routes.ts
frontend/app/globals.css
```

---

## 16. Daily execution plan

| Day | Work | Exit |
|---|---|---|
| 1 | P1-01 … P1-05; open PR 1 | remediation merged, CI green |
| 2 | Basket reducer, persistence, reconcile, unit tests; PR 2 | basket logic covered with no UI |
| 3 | Basket UI, routes, drawer; PR 3 | products can be collected and survive reload |
| 4 | Form steps, `Field`, `Toast`, validation, idempotency; PR 4 and 5 | a real submission reaches confirmation |
| 5 | Staff list, detail, assign, notes, status; PR 6 and 7 | staff can work the queue end to end |

If day 4 slips, cut the staff workspace to list plus detail plus status and
defer assignment and notes. Do not cut the idempotency work, the failure
states, or the accessibility criteria.

---

## 17. Definition of done

- [ ] `npm run lint && npm run typecheck && npm test && npm run test:e2e` green
- [ ] All six states implemented on every new list, form and detail surface
- [ ] Full submit path completable by keyboard alone in both locales
- [ ] No translated string outside `lib/i18n.ts`
- [ ] No `uppercase` on a Vietnamese string
- [ ] Every control at least 44px tall
- [ ] Duplicate submission proven impossible by an e2e test
- [ ] No new colour, type or radius token beyond the `status` additions
- [ ] Basket clears on success and never on failure
- [ ] ADR 0004 written
- [ ] Layout holds at 320px, 768px and 1280px with a 12-line basket and a
      64-character company name

---

## 18. Claude Code handoff summary

Start by reading `docs/UniGreen_Sprint_1_Catalogue.md` sections 4, 8 and 15 for
the established conventions, then this document end to end.

Then, in order:

1. Land PR 1. Do not start feature work with the remediation outstanding.
2. Confirm the contract gate in section 7. If the inquiry paths are absent from
   `contracts/openapi.json`, stop and report — do not hand-write the types.
3. Build the basket bottom-up: reducer, then persistence, then UI. The reducer
   must be testable without React.
4. Treat idempotency as a correctness requirement, not a nicety. A duplicate
   customer record is the most expensive bug this sprint can ship.
5. Report uncertainty explicitly. If a contract field is ambiguous, ask rather
   than guessing at a shape and building three screens on it.
