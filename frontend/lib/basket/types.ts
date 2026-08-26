export type QuantityUnit = "cartons" | "containers_40hc";

export type Availability = "available" | "unavailable" | "unverified";

export interface BasketItem {
  /**
   * Identity, URL segment and submitted key, all one field.
   *
   * The public catalogue is slug-addressed and publishes no product id, so
   * `product_slug` replaces the `product_id` Sprint 2 section 6 originally
   * specified. A stable slug is a Sprint 1 section 4.4 publication
   * requirement, which is what makes it safe to key on.
   */
  readonly productSlug: string;
  /**
   * Display cache, refreshed on revalidation, and submitted alongside the slug
   * so staff can reconcile a line against the mill's own numbering even if a
   * slug is later changed. Never authoritative on its own.
   */
  readonly sku: string;
  readonly name: string;
  readonly imageUrl: string | null;
  readonly quantity: number;
  readonly unit: QuantityUnit;
  readonly packOption?: string | null;
  readonly note: string | null;
  readonly availability: Availability;
}

export interface BasketState {
  readonly version: 1;
  readonly updatedAt: string;
  readonly items: readonly BasketItem[];
}

/** Section 4.1. Both caps reject the add; neither silently truncates. */
export const MAX_ITEMS = 40;
export const MAX_SERIALIZED_BYTES = 32 * 1024;

/**
 * Section 6. There is no minimum-order figure in the public contract, so a
 * line starts at 1 and no below-minimum warning is possible — see the API
 * request document, question 8.
 */
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 99_999;
export const DEFAULT_QUANTITY = 1;

export const BASKET_STORAGE_KEY = "ug.basket.v1";
export const BASKET_VERSION = 1;
