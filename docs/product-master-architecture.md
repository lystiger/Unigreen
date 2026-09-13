# Product master: UniOps owns product identity

Sprint PRODUCT-MASTER-01. This document is the contract between UniOps and the
Unigreen catalogue for product identity. The same text, from the UniOps side, is
in `UniOps/source/docs/product-master.md`.

## 1. Source of truth

| Concern | Owner | Where it lives |
| --- | --- | --- |
| Canonical product id, SKU | UniOps | `products.id`, `products.sku` |
| Official name, unit, category, active/discontinued, structured specifications | UniOps | `products` |
| EasyBooks mapping (material goods code and id) | UniOps, written by the EasyBooks sync | `products.code`, `products.easybooks_material_goods_id` |
| Public titles and descriptions (vi/en), slug, SEO, publication, featured, sort order, pack options shown to buyers, category placement, public specification labels | Unigreen | `products`, `product_translations`, `product_specifications`, `product_category_links` |
| Product images | Unigreen stores them; they belong to the canonical product's lifecycle | `product_media` |
| Accounting documents | EasyBooks | external |

EasyBooks is an external accounting system and a mapping target. It is not the
product master: a product EasyBooks knows and UniOps does not becomes a UniOps
product with a UniOps SKU; EasyBooks never assigns identity.

## 2. Data flow

Before:

```
EasyBooks ──sync──> UniOps products (code = EasyBooks code, no SKU)

Unigreen products (own sku, typed by staff) ──> public catalogue
        (no link between the two; the same product had two identities)
```

After:

```
EasyBooks ──sync (one way)──> UniOps canonical product
                                id, SKU UG000123, name, unit, status, specs,
                                EasyBooks code/id
                                     │
                     GET /api/products[/{id}]   (X-UniOps-Catalog-Key)
                     POST /api/products          (request a new product)
                                     │   one way: UniOps ──> Unigreen
                                     ▼
Unigreen catalogue product ── canonical_product_id ─┐
  slug, vi/en titles, descriptions, SEO,            │ sku = read-only copy
  publication, media (product_media.product_id)     │ of the UniOps SKU
                                     │
                                     ▼
            public catalogue / inquiry snapshot (shows SKU UG000123)
```

Trace for one product: UniOps `products.id` → `products.sku` → Unigreen
`products.canonical_product_id` (unique) → Unigreen `products.sku` (copy) →
`GET /api/v1/public/products/{slug}` → `sku`. Media: `product_media.product_id` →
Unigreen `products.id` → `canonical_product_id`.

## 3. Canonical product lifecycle (UniOps)

- **Create.** `POST /api/products` (office/admin session, or the catalogue service
  key). The body carries name, unit, category, specifications and optionally the
  EasyBooks code; it may not carry a SKU (422). UniOps allocates the SKU in the same
  transaction. The EasyBooks sync also creates products it has not seen.
- **Read.** `GET /api/products?search=&category=&status=`, `GET /api/products/{id}`.
- **Change.** `PATCH /api/products/{id}` (office/admin session only; the service
  key cannot edit): name, unit, category, specifications, status. `sku`, `id` and
  the EasyBooks mapping are not accepted.
- **Discontinue.** `PATCH` with `status: "discontinued"`. There is no delete, so a
  SKU is never freed.
- **Variants.** A materially different sellable variant is a separate product with
  its own SKU: ply, core/coreless, roll length, dimensions, weight, units per pack
  or carton, material, pack configuration. Wording, marketing copy, SEO, images and
  text corrections are not; they are edits (UniOps) or presentation (Unigreen).

Known limit: for a product linked to EasyBooks, the sync overwrites `name` and
`unit` from EasyBooks on each run, as it did before this sprint.

## 4. SKU policy

- Form `UG` + six digits: `UG000001`. Non-semantic; nothing about ply, size or
  packaging is encoded, so no product change can make a SKU wrong.
- Allocated only by `app.services.catalog.allocate_sku`: a single
  `UPDATE product_sku_sequence SET last_number = last_number + 1 ... RETURNING`
  inside the creating transaction. On PostgreSQL the row lock is held until commit,
  so concurrent creations serialise and cannot read the same number, across
  processes. A rolled-back creation returns its number; a committed number is never
  handed out again, even if the product row were removed.
- Database enforcement: `NOT NULL`, unique constraint `uq_product_sku`, check
  constraint `ck_products_sku_format`. There is no column default, so any code path
  that forgets to allocate fails loudly instead of inventing a SKU.
- Exhaustion (`UG999999`) fails with `SKU_SEQUENCE_EXHAUSTED`; it never wraps.
- Existing products were backfilled `UG000001…` in creation order by migration
  `c2e91a4b8701`.

## 5. Unigreen catalogue extension model

- `products.canonical_product_id` (nullable `VARCHAR(36)`, unique index
  `ix_products_canonical_product_id`): the UniOps product this entry presents. One
  canonical product is presented by at most one catalogue entry.
- **Compatibility field: `products.sku`.** Kept so the public API, search, sorting
  and inquiry snapshots keep working without calling UniOps. For a mapped entry it
  is a read-only copy of the UniOps SKU, written only when mapping. It is not a
  second authority:
  - `POST /api/v1/staff/products` has no `sku` field and rejects one; it requires
    `canonical_product_id` and copies the SKU from UniOps.
  - `PATCH /api/v1/staff/products/{id}` refuses a different SKU on a mapped entry
    (`409 SKU_MANAGED_BY_UNIOPS`) and cannot set or change the mapping.
  - For an unmapped legacy entry, `sku` is still the legacy catalogue SKU and stays
    editable until the entry is mapped.
  Because the UniOps SKU is immutable, the copy cannot drift.
- Unigreen never stores the EasyBooks code or operational specifications. Staff
  see the EasyBooks code while mapping, read live from UniOps.

### Staff API

| Route | Purpose |
| --- | --- |
| `GET /api/v1/staff/products?mapping_status=mapped\|unmapped` | Migration progress |
| `POST /api/v1/staff/products` | Create; `canonical_product_id` required |
| `POST /api/v1/staff/products/{id}/map` | Map an entry to a UniOps product (audited `product.mapped` with previous SKU) |
| `POST /api/v1/staff/products/{id}/unmap` | Remove a mapping (audited `product.unmapped`; the entry keeps its last SKU) |
| `GET /api/v1/staff/canonical-products?search=&status=` | UniOps products with SKU, EasyBooks code and which catalogue entry presents each |
| `POST /api/v1/staff/canonical-products` | Ask UniOps for a new product when none matches; UniOps assigns the SKU; not mapped automatically |

Failure codes: `UNIOPS_NOT_CONFIGURED` (503), `UNIOPS_UNAVAILABLE`,
`UNIOPS_CREDENTIALS_REJECTED`, `UNIOPS_CONTRACT_MISMATCH`, `UNIOPS_REQUEST_FAILED`
(502), `CANONICAL_PRODUCT_NOT_FOUND` (422), `CANONICAL_PRODUCT_ALREADY_MAPPED`,
`PRODUCT_ALREADY_MAPPED`, `SKU_MANAGED_BY_UNIOPS`, `CANONICAL_PRODUCT_CONFLICT`
(409), `CANONICAL_PRODUCT_INVALID` (422).

### Integrity rules

- Mapping is always a staff decision. Nothing matches by name or text, and there
  is no automatic suggestion in this sprint.
- A reference is checked against UniOps at the moment it is written (create, map).
  A missing UniOps product fails with `CANONICAL_PRODUCT_NOT_FOUND`.
- A mapped entry is not silently remapped: unmap first (`PRODUCT_ALREADY_MAPPED`).
- UniOps unreachable: mapping and creation fail with an explicit code; the public
  catalogue, which reads only Unigreen's own tables, is unaffected.

## 6. Service authentication

UniOps setting `UNIOPS_CATALOG_SERVICE_KEY` (≥ 32 characters). Unigreen settings
`UNIGREEN_UNIOPS_BASE_URL` and `UNIGREEN_UNIOPS_CATALOG_KEY`. Unigreen sends the key
in `X-UniOps-Catalog-Key`. The key is compared in constant time and opens only
`GET /api/products`, `GET /api/products/{id}` and `POST /api/products`; it is not a
user and cannot reach orders, customers, finance or `PATCH`. A wrong key is refused
with `401 CATALOG_SERVICE_KEY_INVALID`. Keep both services on the internal network.

## 7. Migration strategy

1. Deploy UniOps; run `alembic upgrade head`. Every existing product receives a SKU;
   the counter starts after the last one. (`db_transfer` replaces the seeded counter
   row rather than refusing the target.)
2. Configure the shared key on both sides; deploy Unigreen; run
   `alembic upgrade head` (adds the nullable column; existing entries are unmapped).
3. Staff work through **Admin → Products → Unmapped**. For each entry: search UniOps
   by SKU, name or EasyBooks code; map it. If no UniOps product exists, create one
   from the same panel, then map. Each mapping replaces the legacy SKU with the
   UniOps SKU and records the previous one in the audit event.
4. Unmapped entries keep working publicly with their legacy SKU. New entries can
   only be created mapped.
5. Later sprint, once `mapping_status=unmapped` is empty: make
   `canonical_product_id` `NOT NULL` and drop legacy SKU editing.

Rollback: Unigreen downgrade drops `canonical_product_id` (mappings are lost; SKUs
already copied stay). UniOps downgrade drops `sku`, `category`, `status`,
`specifications` and the counter; do not downgrade UniOps after Unigreen entries
have been mapped, or the copied SKUs lose their source.

## 8. Media ownership boundary

Images stay in Unigreen's storage and pipeline (`product_media`, the storage
abstraction, variants); nothing is copied to UniOps. Conceptually they belong to
the canonical product: every media row references a catalogue product, and every
mapped catalogue product references exactly one canonical product, so every image
is traceable to a UniOps id and SKU. An image is never stored twice.

## 9. Anti-pattern: bidirectional product-master sync

Do not add background replication in either direction, and never write identity
from Unigreen back into UniOps fields or from UniOps into Unigreen presentation
fields. Two-way sync creates two writers for one fact; conflicts are then resolved
by timing rather than by authority, and the duplicated identity this sprint removes
returns. The only writes across the boundary are explicit, staff-initiated
requests: map (reads UniOps, writes Unigreen) and create (asks UniOps to create; the
response is UniOps' own record). EasyBooks → UniOps also stays one way.

## 10. Open questions

- Should a discontinued UniOps product automatically be flagged in Unigreen admin
  (it is shown in the picker, but a published entry is not unpublished)?
- Should the EasyBooks sync stop overwriting `name` for UniOps-created products?
- Should UniOps `category` become a reference table instead of free text?
- Should discontinued products be excluded from new UniOps orders?
