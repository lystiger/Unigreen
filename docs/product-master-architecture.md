# Canonical Product-Master Architecture (Sprint PRODUCT-MASTER-01)

## 1. Executive Summary & Objectives

Prior to this architecture, product identity was fragmented across UniOps, Unigreen, and EasyBooks. This resulted in duplicated product representations, semantic code drift, and ambiguity over which system authoritatively owned product definitions and stock-keeping units (SKUs).

**Sprint Objective:**
Establish a canonical product-master architecture where:
- **UniOps** serves as the authoritative business identity source for all products (canonical product master).
- **Unigreen** serves as the presentation, marketing catalogue, and media extension layer, referencing canonical products without independent ownership of SKU or business identity.
- **EasyBooks** remains an external accounting source and mapping target, not the canonical product system.
- **Physical Media** remains stored and served within Unigreen, but traces directly back to `canonical_product_id`.
- **Public Catalogue Stability** is preserved with zero breaking changes to public endpoints, quote baskets, or customer inquiry workflows.

---

## 2. Core Architectural Rules

1. **UniOps Owns Canonical Product Identity:**
   - Sequential, non-semantic business SKU format: `UG000001` through `UG999999`.
   - Authoritative fields: `id`, `sku`, `name`, `unit`, `category`, `status` (`active`, `discontinued`), `specifications` (structured JSON), and `easybooks_code` (external accounting mapping).
   - All downstream consumers and operational processes (orders, manufacturing, purchasing, quotation review) rely on this identity.

2. **Unigreen Does Not Independently Own SKU:**
   - Unigreen catalogue records reference `canonical_product_id` (foreign business key to UniOps).
   - The `sku` column on Unigreen's `products` table acts as a backward-compatible shadow field synchronized from UniOps upon mapping.
   - When mapped, the SKU in Unigreen's staff editor is read-only and authoritative from UniOps.

3. **EasyBooks is an External Mapping Target, Not Master Data:**
   - UniOps reconciles EasyBooks codes (`easybooks_code` / `code`) and material goods IDs (`material_goods_id`) against canonical products.
   - Synchronizing from EasyBooks generates or maps to sequential canonical SKUs in UniOps.
   - Unigreen has zero direct integration with EasyBooks.

4. **No Two-Way Master-Data Synchronization:**
   - The flow of canonical truth is strictly one-way: `UniOps -> Unigreen`.
   - Unigreen never pushes presentation fields (e.g. bilingual translations, marketing slugs, or image metadata) back to UniOps.
   - Unigreen staff portal may create new canonical products in UniOps via dedicated proxy endpoints (`POST /api/v1/staff/canonical-products`).

5. **Media Storage Preservation:**
   - High-resolution product images, thumbnails, and responsive variants remain stored and managed in Unigreen's media pipeline (`ProductMedia`).
   - Every media record traces back to `canonical_product_id` via `Product.canonical_product_id`.

6. **Zero Public Catalogue Regression:**
   - Public catalogue APIs (`GET /api/v1/public/products`, `GET /api/v1/public/products/{slug}`) continue returning `sku` and product specifications without contract changes.
   - Public inquiry submissions and basket state machines remain fully functional.

---

## 3. System Architecture & Boundaries

```
 +-------------------------------------------------------+
 |                 EasyBooks Accounting                  |
 |  (External Accounting & Invoicing, TP.GVS700/2, etc.) |
 +---------------------------+---------------------------+
                             |
                   Inbound Accounting Sync
                             |
                             v
 +-------------------------------------------------------+
 |                 UniOps Business Core                  |
 |       - Canonical Product Master (SoR)                |
 |       - Sequential SKU Generator (UG000001+)          |
 |       - Concurrency-safe atomic sequence allocation   |
 |       - EasyBooks code & goods ID reconciliation      |
 |       - Order Board, Inventory & PO Management        |
 +---------------------------+---------------------------+
                             |
              Internal API (X-UniOps-Key)
              GET /api/v1/products
              GET /api/v1/products/{id}
              POST /api/v1/products
                             |
                             v
 +-------------------------------------------------------+
 |               UniGreen Catalogue & Media              |
 |       - Presentation / Marketing Extension Layer      |
 |       - Products have canonical_product_id (nullable) |
 |       - Synchronized shadow SKU                       |
 |       - Bilingual translations (vi/en)                |
 |       - Media storage & image optimization pipeline   |
 |       - Public B2B catalogue & quote request basket   |
 +-------------------------------------------------------+
```

---

## 4. Sequential SKU Generation in UniOps

Canonical SKUs are strictly non-semantic and follow the pattern `^UG\d{6}$` (`UG000001` upwards).

### Concurrency Safety
In UniOps (`backend/app/services/catalog.py`), SKU allocation is protected against race conditions using a dedicated sequence table `product_sku_sequence`:
- An atomic SQL statement increments and returns the next number:
  ```sql
  UPDATE product_sku_sequence
  SET last_number = product_sku_sequence.last_number + 1
  RETURNING last_number;
  ```
- Combined with a thread lock in the application process, concurrent creation requests produce strictly monotonically increasing, collision-free SKUs.

### Custom SKU Validation
If an explicit canonical SKU is provided during product creation in UniOps, it is validated against `^UG\d{6}$`. Unique database index `ix_products_sku` guarantees uniqueness.

---

## 5. Unigreen Shadow Field Pattern & Migration Strategy

To support gradual onboarding of catalogue products without downtime or disruptive data migrations:

1. **Nullable Canonical Link:**
   - The Unigreen `products` table has a nullable column `canonical_product_id VARCHAR(36)`.
   - A unique partial index ensures no two catalogue products map to the same canonical product:
     `CREATE UNIQUE INDEX ix_products_canonical_product_id ON products(canonical_product_id) WHERE canonical_product_id IS NOT NULL;`

2. **Shadow SKU Synchronization:**
   - When a product is created with `canonical_product_id`, or mapped via `POST /api/v1/staff/products/{id}/map`:
     - Unigreen verifies the canonical product in UniOps via `UniOpsClient`.
     - Sets `product.canonical_product_id = canonical_product_id`.
     - Updates `product.sku = canonical.sku`.
     - Emits an audit event `product.mapped`.
   - When a product is unmapped (`POST /api/v1/staff/products/{id}/unmap`):
     - `product.canonical_product_id` is set to `NULL`.
     - `product.sku` is retained as a fallback shadow string.
     - Emits an audit event `product.unmapped`.

3. **Incremental Migration Flow:**
   - Unmapped products continue functioning with legacy SKUs and are marked with an `Unmapped` badge in the staff portal.
   - Staff can search available UniOps products and map items on a per-product basis or during catalogue reviews.
   - Filter `GET /api/v1/staff/products?mapping_status=mapped|unmapped` allows staff to track migration progress.

---

## 6. Authentication & Security Boundaries

- Communication between Unigreen and UniOps uses internal service authentication:
  - Header: `X-UniOps-Key: <UNIGREEN_UNIOPS_API_KEY>` or `Authorization: Bearer <key>`.
  - UniOps validates the key and grants internal service access as `service:internal` with administrator permissions.
- In production, URLs are required to use HTTPS, configured via `UNIGREEN_UNIOPS_BASE_URL`.

---

## 7. Verification & Quality Gates

| Repository | Test Suite | Linting & Static Analysis | Production Build |
| :--- | :--- | :--- | :--- |
| **UniOps Backend** | 293 passed (`pytest`) | Ruff clean | N/A |
| **UniOps Frontend** | 97 passed (`vitest`) | ESLint clean | `tsc -b && vite build` (code 0) |
| **Unigreen Backend** | 97 passed (91.5% coverage) | Ruff & Mypy clean | N/A |
| **Unigreen Frontend** | 83 passed (`vitest` + design rules) | ESLint & `tsc --noEmit` clean | `next build` (code 0) |
