import {
  BASKET_VERSION,
  DEFAULT_QUANTITY,
  MAX_ITEMS,
  MAX_QUANTITY,
  MIN_QUANTITY,
  type Availability,
  type BasketItem,
  type BasketState,
  type QuantityUnit,
} from "./types";

/**
 * The basket as a pure reducer — deliberately free of React and of any
 * transport, so the rules that decide what a buyer is asking us to quote can
 * be tested in isolation (Sprint 2, section 6).
 *
 * Every action returns a new state; a rejected action returns the state
 * unchanged plus a `rejection`, so the caller can surface a toast instead of
 * the basket silently doing something other than what was asked.
 *
 * Lines are keyed by `productSlug`. Nothing here interprets that string.
 */

export type BasketAction =
  | { readonly type: "add"; readonly item: NewBasketItem }
  | { readonly type: "remove"; readonly productSlug: string }
  | {
      readonly type: "setQuantity";
      readonly productSlug: string;
      readonly quantity: number;
    }
  | {
      readonly type: "setUnit";
      readonly productSlug: string;
      readonly unit: QuantityUnit;
    }
  | {
      readonly type: "setNote";
      readonly productSlug: string;
      readonly note: string | null;
    }
  | { readonly type: "reconcile"; readonly published: readonly PublishedProduct[] }
  | { readonly type: "clear" };

export interface NewBasketItem {
  readonly productSlug: string;
  readonly sku: string;
  readonly name: string;
  readonly imageUrl?: string | null;
  readonly quantity?: number;
  readonly unit?: QuantityUnit;
  readonly note?: string | null;
}

/** The subset of the public product response the basket caches for display. */
export interface PublishedProduct {
  readonly productSlug: string;
  readonly sku: string;
  readonly name: string;
  readonly imageUrl: string | null;
}

export type RejectionReason = "item-cap-reached" | "unknown-item";

export interface BasketResult {
  readonly state: BasketState;
  /** Absent when the action applied. */
  readonly rejection?: RejectionReason;
  /** True when `add` incremented an existing line rather than appending. */
  readonly incremented?: boolean;
}

export function emptyBasket(now: () => Date = () => new Date()): BasketState {
  return { version: BASKET_VERSION, updatedAt: now().toISOString(), items: [] };
}

/**
 * Quantity is clamped rather than rejected: a buyer typing past the maximum
 * means "as many as possible", and the mill would rather quote the cap than
 * drop the line. Non-integers round down; NaN falls back to the minimum.
 */
export function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return MIN_QUANTITY;
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.floor(value)));
}

export function basketReducer(
  state: BasketState,
  action: BasketAction,
  now: () => Date = () => new Date(),
): BasketResult {
  const touched = (items: readonly BasketItem[]): BasketState => ({
    version: BASKET_VERSION,
    updatedAt: now().toISOString(),
    items,
  });

  switch (action.type) {
    case "add": {
      const { item } = action;
      const existing = state.items.findIndex(
        (line) => line.productSlug === item.productSlug,
      );
      const quantity = clampQuantity(item.quantity ?? DEFAULT_QUANTITY);

      if (existing !== -1) {
        const current = state.items[existing]!;
        const items = state.items.map((line, index) =>
          index === existing
            ? { ...line, quantity: clampQuantity(current.quantity + quantity) }
            : line,
        );
        return { state: touched(items), incremented: true };
      }

      if (state.items.length >= MAX_ITEMS) {
        return { state, rejection: "item-cap-reached" };
      }

      const line: BasketItem = {
        productSlug: item.productSlug,
        sku: item.sku,
        name: item.name,
        imageUrl: item.imageUrl ?? null,
        quantity,
        unit: item.unit ?? "cartons",
        note: item.note ?? null,
        // Freshly added from a live response, so it is known good until the
        // next reconcile says otherwise.
        availability: "available",
      };
      return { state: touched([...state.items, line]) };
    }

    case "remove": {
      const items = state.items.filter(
        (line) => line.productSlug !== action.productSlug,
      );
      if (items.length === state.items.length) {
        return { state, rejection: "unknown-item" };
      }
      return { state: touched(items) };
    }

    case "setQuantity":
      return updateLine(state, action.productSlug, now, (line) => ({
        ...line,
        quantity: clampQuantity(action.quantity),
      }));

    case "setUnit":
      return updateLine(state, action.productSlug, now, (line) => ({
        ...line,
        unit: action.unit,
      }));

    case "setNote":
      return updateLine(state, action.productSlug, now, (line) => ({
        ...line,
        note: action.note === null || action.note === "" ? null : action.note,
      }));

    case "reconcile": {
      const bySlug = new Map(action.published.map((p) => [p.productSlug, p]));
      const items = state.items.map((line): BasketItem => {
        const fresh = bySlug.get(line.productSlug);
        if (fresh === undefined) {
          // Unpublished or deleted since it was added. Kept visible and struck
          // through so the buyer sees what changed, excluded from submission.
          return { ...line, availability: "unavailable" };
        }
        return {
          ...line,
          sku: fresh.sku,
          name: fresh.name,
          imageUrl: fresh.imageUrl,
          availability: "available",
        };
      });
      return { state: touched(items) };
    }

    case "clear":
      return { state: emptyBasket(now) };
  }
}

function updateLine(
  state: BasketState,
  productSlug: string,
  now: () => Date,
  change: (line: BasketItem) => BasketItem,
): BasketResult {
  const index = state.items.findIndex((line) => line.productSlug === productSlug);
  if (index === -1) {
    return { state, rejection: "unknown-item" };
  }
  const items = state.items.map((line, i) => (i === index ? change(line) : line));
  return {
    state: { version: BASKET_VERSION, updatedAt: now().toISOString(), items },
  };
}

/** Lines that may be submitted. Unavailable lines are excluded (section 4.2). */
export function submittableItems(state: BasketState): readonly BasketItem[] {
  return state.items.filter((line) => line.availability !== "unavailable");
}

export function itemCount(state: BasketState): number {
  return state.items.length;
}

export function hasUnavailable(state: BasketState): boolean {
  return state.items.some((line) => line.availability === "unavailable");
}

export function availabilityOf(line: BasketItem): Availability {
  return line.availability;
}
