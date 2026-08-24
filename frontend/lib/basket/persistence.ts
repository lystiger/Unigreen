import { emptyBasket } from "./reducer";
import {
  BASKET_STORAGE_KEY,
  BASKET_VERSION,
  MAX_ITEMS,
  MAX_SERIALIZED_BYTES,
  type BasketItem,
  type BasketState,
  type QuantityUnit,
} from "./types";

/**
 * localStorage is the basket's only home in Sprint 2 — there are no customer
 * accounts yet (section 4.1).
 *
 * Two rules shape everything here. First, nothing may run during render: the
 * server and the first client render must agree, so reading is a separate call
 * the caller makes from an effect. Second, stored data is untrusted input —
 * it survives across deploys, so a shape from a previous release, a truncated
 * write, or a hand-edited value must all degrade to an empty basket rather
 * than crash a page.
 */

export type LoadOutcome =
  | { readonly status: "empty" }
  | { readonly status: "loaded"; readonly state: BasketState }
  | { readonly status: "discarded"; readonly reason: DiscardReason };

export type DiscardReason = "unparseable" | "unknown-version" | "malformed";

export type SaveOutcome =
  | { readonly status: "saved" }
  | { readonly status: "rejected"; readonly reason: "too-large" }
  | { readonly status: "unavailable" };

function storage(): Storage | null {
  // Absent during SSR, and throws in Safari private mode rather than returning
  // null, so the access itself has to be guarded.
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadBasket(): LoadOutcome {
  const store = storage();
  if (store === null) return { status: "empty" };

  const raw = store.getItem(BASKET_STORAGE_KEY);
  if (raw === null) return { status: "empty" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: "discarded", reason: "unparseable" };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { status: "discarded", reason: "malformed" };
  }

  const candidate = parsed as Record<string, unknown>;

  // A higher version is a basket written by a newer release. Discarded, never
  // migrated — guessing at a future shape is how you corrupt a real order.
  if (candidate.version !== BASKET_VERSION) {
    return { status: "discarded", reason: "unknown-version" };
  }

  if (!Array.isArray(candidate.items)) {
    return { status: "discarded", reason: "malformed" };
  }

  const items: BasketItem[] = [];
  for (const entry of candidate.items) {
    const line = parseItem(entry);
    if (line === null) return { status: "discarded", reason: "malformed" };
    items.push(line);
  }

  if (items.length > MAX_ITEMS) {
    return { status: "discarded", reason: "malformed" };
  }

  return {
    status: "loaded",
    state: {
      version: BASKET_VERSION,
      updatedAt:
        typeof candidate.updatedAt === "string"
          ? candidate.updatedAt
          : new Date(0).toISOString(),
      items,
    },
  };
}

const UNITS: readonly QuantityUnit[] = ["cartons", "containers_40hc"];

function parseItem(value: unknown): BasketItem | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;

  const str = (k: string): string | null => (typeof v[k] === "string" ? v[k] : null);
  const nullableStr = (k: string): string | null | undefined =>
    v[k] === null || typeof v[k] === "string"
      ? ((v[k] as string | null) ?? null)
      : undefined;

  const productSlug = str("productSlug");
  const sku = str("sku");
  const name = str("name");
  const imageUrl = nullableStr("imageUrl");
  const note = nullableStr("note");

  if (
    productSlug === null ||
    sku === null ||
    name === null ||
    imageUrl === undefined ||
    note === undefined ||
    typeof v.quantity !== "number" ||
    !Number.isFinite(v.quantity) ||
    !UNITS.includes(v.unit as QuantityUnit)
  ) {
    return null;
  }

  return {
    productSlug,
    sku,
    name,
    imageUrl,
    quantity: v.quantity,
    unit: v.unit as QuantityUnit,
    note,
    // Availability is never trusted from storage. Anything restored is stale
    // until reconcile has spoken to the catalogue (section 4.2).
    availability: "unverified",
  };
}

export function saveBasket(state: BasketState): SaveOutcome {
  const store = storage();
  if (store === null) return { status: "unavailable" };

  const serialized = JSON.stringify(state);
  if (byteLength(serialized) > MAX_SERIALIZED_BYTES) {
    return { status: "rejected", reason: "too-large" };
  }

  try {
    store.setItem(BASKET_STORAGE_KEY, serialized);
    return { status: "saved" };
  } catch {
    // Quota exceeded, or storage disabled mid-session.
    return { status: "unavailable" };
  }
}

export function clearBasket(): void {
  storage()?.removeItem(BASKET_STORAGE_KEY);
}

/** Would this state serialize within the cap? Lets `add` refuse before committing. */
export function fitsWithinCap(state: BasketState): boolean {
  return byteLength(JSON.stringify(state)) <= MAX_SERIALIZED_BYTES;
}

function byteLength(value: string): number {
  // The cap is a storage budget, so it counts encoded bytes. Vietnamese names
  // are multi-byte, and `.length` would undercount them by roughly a third.
  return new TextEncoder().encode(value).length;
}

/** The state a first render must produce on both server and client. */
export function initialBasket(): BasketState {
  return emptyBasket(() => new Date(0));
}
