# Sprint 2 — frontend API request to Codex/backend

Raised by: Claude Code (frontend)
Date: 2026-07-27
Blocks: `docs/UniGreen_Sprint_2_Inquiry_Frontend.md` PRs 3–7
Source of requirements: that document, section 7

---

## 1. Why this exists

Sprint 2 section 7 sets a hard gate:

> **Gate: do not begin PR 3 until `contracts/openapi.json` contains these paths
> and `npm run api:types` regenerates `lib/api/schema.d.ts` cleanly.**

and section 18 point 2 instructs the frontend to stop and report rather than
hand-write types when the contract is absent.

`contracts/openapi.json` currently publishes 23 paths. None are inquiry paths:

```
/health/live                                   /api/v1/public/categories
/health/ready                                  /api/v1/public/products
/api/v1/auth/login                             /api/v1/public/products/{slug}
/api/v1/auth/logout                            /api/v1/public/media/{media_id}/{variant}
/api/v1/auth/me                                /api/v1/staff/categories …          (4)
                                               /api/v1/staff/products …            (9)
```

So `lib/api/types.ts` has nothing to alias and no inquiry screen can be built
against a generated type. This document is the request.

## 2. What is unblocked meanwhile

PR 1 (Sprint 1 remediation) and PR 2 (basket state and persistence) need no
API. The basket reducer, its persistence layer and their unit tests are
deliberately React-free and transport-free, so they are being delivered now.

The first thing that blocks is PR 3, which needs the public product endpoint
for basket revalidation, and then PR 5, which needs the submission endpoint.

## 3. Endpoints requested

### 3.1 Public submission

```
POST /api/v1/public/inquiries
```

Request header `Idempotency-Key: <uuid4>`, required.

Body:

| Field | Type | Required | Note |
|---|---|---|---|
| `locale` | `"vi" \| "en"` | yes | drives the acknowledgement email language |
| `company.name` | string | yes | |
| `company.tax_code` | string | no | |
| `company.country` | string | yes | ISO 3166-1 alpha-2 preferred — please confirm |
| `company.city` | string | no | |
| `company.website` | string | no | |
| `contact.full_name` | string | yes | |
| `contact.email` | string | yes | |
| `contact.phone` | string | yes | international formats must pass |
| `contact.role` | string | no | |
| `delivery.incoterm` | string | no | enum or free text? see §5 |
| `delivery.destination` | string | yes | |
| `delivery.target_date` | date | no | |
| `delivery.notes` | string | no | |
| `items[].product_slug` | string | yes | see question 5 — replaces `product_id` |
| `items[].sku` | string | yes | sent for reconciliation; backend re-derives |
| `items[].quantity` | integer | yes | 1 … 99,999 |
| `items[].unit` | `"cartons" \| "containers_40hc"` | yes | |
| `items[].note` | string | no | |
| `oem_requested` | boolean | yes | |
| `requirements` | string | no | |
| `anti_spam.honeypot` | string | yes | must be empty to pass |
| `anti_spam.elapsed_ms` | integer | yes | from first form interaction |

Responses:

| Status | Body | Frontend behaviour |
|---|---|---|
| `201` | `{ reference, status, submitted_at }` | render confirmation, clear basket and key |
| `400` | `ErrorEnvelope`, `field_errors` by dotted path | focus first offending control, jump to its step |
| `409` | `ErrorEnvelope` `INQUIRY_ITEMS_UNAVAILABLE`, `field_errors["items"]` | return to step 1, flag those lines |
| `429` | `ErrorEnvelope` `RATE_LIMITED` + `Retry-After` seconds | countdown, form state preserved |

### 3.2 Staff workspace

```
GET   /api/v1/staff/inquiries?status=&assignee=&q=&from=&to=&page=&page_size=
GET   /api/v1/staff/inquiries/{inquiry_id}
PATCH /api/v1/staff/inquiries/{inquiry_id}          { status }
POST  /api/v1/staff/inquiries/{inquiry_id}/assign   { staff_user_id | null }
POST  /api/v1/staff/inquiries/{inquiry_id}/notes    { body }
GET   /api/v1/staff/customers?q=&page=&page_size=
GET   /api/v1/staff/customers/{customer_id}
```

Cookie session plus `X-CSRF-Token`, as established in Sprint 1. List responses
should reuse `PaginationMetadata` (`page`, `page_size`, `total`, `total_pages`)
so the existing pagination and the P1-05 live-region count work unchanged.

Inquiry status enum, per Sprint 2 section 4.5:
`new`, `assigned`, `in_progress`, `closed`, `spam`.

## 4. Two behaviours the frontend depends on

**Idempotency.** A repeated `POST` carrying an `Idempotency-Key` already seen
must return the original record — ideally `201` with the same body, or `200`.
It must not return a conflict, because the client renders whatever comes back
as the confirmation screen. Sprint 2 section 4.3 calls a duplicate customer
record the most expensive bug this sprint can ship, and the client half of the
guarantee is worthless without this half.

**`field_errors` keyed by dotted path.** `contact.email`, `items.2.quantity`.
The client maps the key to a control, focuses it and navigates to its step. A
flat or message-only error body means server-side validation cannot be shown
against the field that caused it.

## 5. Open questions

*Question 6 is blocking. Question 5 is decided and is now a change request
against section 7. Question 8 is withdrawn. The rest shape the types.*

1. `company.country` — ISO 3166-1 alpha-2, or free text?
2. `delivery.incoterm` — fixed enum (and which terms), or free text?
3. Does `201` carry the full submitted record, or only
   `{ reference, status, submitted_at }`? The confirmation screen needs only
   the reference, so the narrow shape is fine — confirming so the type is not
   over-modelled.
4. On a repeated `Idempotency-Key`, is the status `201` or `200`?
5. **Decided — rename `product_id` to `product_slug`, and add `sku`.**
   *Resolved by the product owner on 2026-07-27. This is now a change request
   against section 7, not a question.*

   The public catalogue publishes no product id, and adding one would expose an
   internal identifier for no gain when a stable slug is already a Sprint 1
   section 4.4 publication requirement. The submission item shape becomes:

   ```
   items[] { product_slug, sku, quantity, unit, note? }
   ```

   `sku` is sent alongside so a line can be reconciled against the mill's own
   numbering if a slug is later changed. The backend remains authoritative and
   should resolve `product_slug` to its own primary key on receipt.

   Section 7's `field_errors` paths follow: `items.2.quantity` is unchanged,
   and an unresolvable line reports against `items.<n>.product_slug`.

   Shipped in PR 3. `BasketItem.productSlug` is the client-side key;
   `frontend/lib/basket/identity.ts` is the only place the mapping lives.

6. **No bulk product lookup.** Section 4.2 says the basket "calls the public
   product endpoint for its stored ids", but `GET /api/v1/public/products`
   filters only by `category`, `q` and `featured` — there is no `ids` or
   `slugs` parameter. Revalidating a 40-line basket today means either 40
   calls to `/products/{slug}` or fetching a large page and filtering client
   side. PR 3 does the latter with `page_size=100`, which is correct only
   while the published catalogue fits in one page. Please add an id/slug
   filter, or confirm a ceiling on catalogue size.

7. Is there a maximum `items[]` length server-side? The client caps at 40
   (section 4.1); if the server's limit is lower the client should match it.
8. ~~Should a minimum-order quantity be added to the public product
   response?~~ **Withdrawn 2026-07-27.**

   Asked because the public schemas carry no MOQ, so section 10.1's "quantity
   defaults to `minOrderCartons` when known" and section 6's below-minimum
   warning had nothing to read.

   Withdrawn rather than answered: the product owner cut the behaviour instead
   of adding the field. A minimum order is a commercial term that belongs in
   the quotation, not on an anonymous public catalogue page where it reads as
   a barrier before a buyer has spoken to anyone — and Sprint 3 owns pricing
   and terms. Publishing an MOQ now would also have to be reviewed as business
   content under the standing Sprint 0 rule.

   Consequences, all shipped in PR 2/PR 3: a line starts at quantity 1, there
   is no below-minimum warning, `BasketItem.minOrderCartons` is gone, and the
   `basket.belowMinimum` copy key is removed from both locales. Reopen only if
   MOQ becomes part of the public catalogue for a different reason.
9. `anti_spam.elapsed_ms` — is there a minimum threshold below which a
   submission is rejected, and is that rejection a `400` or a `429`?

Reference format stays backend-owned. The frontend treats it as an opaque
string and will not parse or generate it.

## 6. Ownership note

Sprint 1 section 15 assigns `docs/**` to Codex/backend, and Sprint 2 section 15
scopes frontend doc edits to the sprint document and ADR 0004. This file was
added at the product owner's explicit request; move, rename or fold it into the
backend sprint document as you prefer.
