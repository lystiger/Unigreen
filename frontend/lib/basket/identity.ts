import type { PublicProduct, PublicProductDetail } from "@/lib/api/types";
import type { NewBasketItem, PublishedProduct } from "./reducer";

/**
 * Maps a public catalogue product onto the fields the basket keeps.
 *
 * ## Identity
 *
 * Lines are keyed by `productSlug`, not by a product id. The public contract
 * publishes no id — `PublicProductSummary` and `PublicProductDetail` carry
 * `sku`, `slug`, `name`, `summary`, `oem_available`, `featured`, `categories`
 * and `primary_media` — and the catalogue is slug-addressed throughout, so the
 * slug is the only identifier a visitor's browser can ever hold.
 *
 * That is now the agreed shape rather than an assumption: submission sends
 * `product_slug` plus `sku` in place of the `product_id` Sprint 2 section 6
 * first specified. `sku` rides along so staff can reconcile a line against the
 * mill's own numbering if a slug is later changed. See the API request
 * document, question 5.
 */

/** Public catalogue product → the fields the basket caches for display. */
export function toBasketItem(
  product: PublicProduct | PublicProductDetail,
  overrides: Pick<NewBasketItem, "quantity" | "unit" | "packOption" | "note"> = {},
): NewBasketItem {
  return {
    productSlug: product.slug,
    sku: product.sku,
    name: product.name,
    imageUrl: primaryImageUrl(product),
    packOption: product.pack_options?.[0] ?? null,
    ...overrides,
  };
}

/** Public catalogue product → the shape `reconcile` compares against. */
export function toPublishedProduct(
  product: PublicProduct | PublicProductDetail,
): PublishedProduct {
  return {
    productSlug: product.slug,
    sku: product.sku,
    name: product.name,
    imageUrl: primaryImageUrl(product),
    packOptions: product.pack_options ?? [],
  };
}

function primaryImageUrl(product: PublicProduct | PublicProductDetail): string | null {
  const variants = product.primary_media?.variants ?? [];
  // Smallest variant at or above the basket thumbnail's rendered width.
  const chosen = variants.find((variant) => variant.width >= 240) ?? variants.at(-1);
  return chosen?.url ?? null;
}
