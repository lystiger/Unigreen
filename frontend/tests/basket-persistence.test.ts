import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearBasket,
  fitsWithinCap,
  initialBasket,
  loadBasket,
  saveBasket,
} from "@/lib/basket/persistence";
import { basketReducer, emptyBasket } from "@/lib/basket/reducer";
import {
  BASKET_STORAGE_KEY,
  MAX_SERIALIZED_BYTES,
  type BasketState,
} from "@/lib/basket/types";

const FIXED = () => new Date("2026-07-27T00:00:00.000Z");

const line = {
  productSlug: "san-pham-1",
  sku: "UG-1",
  name: "Giấy vệ sinh cuộn lớn",
  imageUrl: null,
  quantity: 150,
  unit: "cartons" as const,
  note: null,
};

function stored(value: unknown): void {
  window.localStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify(value));
}

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("load", () => {
  it("returns empty when nothing is stored", () => {
    expect(loadBasket()).toEqual({ status: "empty" });
  });

  it("restores a well-formed basket", () => {
    stored({ version: 1, updatedAt: FIXED().toISOString(), items: [line] });
    const outcome = loadBasket();

    expect(outcome.status).toBe("loaded");
    if (outcome.status !== "loaded") return;
    expect(outcome.state.items).toHaveLength(1);
    expect(outcome.state.items[0]!.sku).toBe("UG-1");
  });

  it("never trusts stored availability", () => {
    stored({
      version: 1,
      updatedAt: FIXED().toISOString(),
      items: [{ ...line, availability: "available" }],
    });
    const outcome = loadBasket();

    if (outcome.status !== "loaded") throw new Error("expected loaded");
    // Stale until reconcile has spoken to the catalogue.
    expect(outcome.state.items[0]!.availability).toBe("unverified");
  });

  it("discards an unparseable value rather than throwing", () => {
    window.localStorage.setItem(BASKET_STORAGE_KEY, "{not json");
    expect(loadBasket()).toEqual({ status: "discarded", reason: "unparseable" });
  });

  it("discards a truncated write", () => {
    window.localStorage.setItem(
      BASKET_STORAGE_KEY,
      '{"version":1,"updatedAt":"2026-07-27T00:00:00.000Z","items":[{"produ',
    );
    expect(loadBasket().status).toBe("discarded");
  });

  it("discards an unknown version without migrating it", () => {
    stored({ version: 2, updatedAt: FIXED().toISOString(), items: [] });
    expect(loadBasket()).toEqual({ status: "discarded", reason: "unknown-version" });

    stored({ version: 0, updatedAt: FIXED().toISOString(), items: [] });
    expect(loadBasket()).toEqual({ status: "discarded", reason: "unknown-version" });
  });

  it("discards structurally wrong payloads", () => {
    for (const payload of [
      [],
      "a string",
      42,
      { version: 1, items: "not an array" },
      { version: 1, items: [{ ...line, quantity: "150" }] },
      { version: 1, items: [{ ...line, unit: "pallets" }] },
      { version: 1, items: [{ ...line, productSlug: 5 }] },
      { version: 1, items: [null] },
    ]) {
      stored(payload);
      expect(loadBasket().status, JSON.stringify(payload).slice(0, 40)).toBe(
        "discarded",
      );
    }
  });

  it("discards a basket written before the productSlug rename", () => {
    // The item shape changed within version 1 (product_id → product_slug + sku)
    // while nothing had shipped, so no real basket carries the old shape. If
    // one does, it must reset to empty rather than half-load a line with no
    // identity the reducer can key on.
    stored({
      version: 1,
      updatedAt: FIXED().toISOString(),
      items: [
        {
          productId: "p1",
          slug: "san-pham-1",
          sku: "UG-1",
          name: "Giấy vệ sinh",
          imageUrl: null,
          minOrderCartons: 150,
          quantity: 150,
          unit: "cartons",
          note: null,
        },
      ],
    });

    expect(loadBasket()).toEqual({ status: "discarded", reason: "malformed" });
  });

  it("discards a basket claiming more lines than the cap allows", () => {
    stored({
      version: 1,
      updatedAt: FIXED().toISOString(),
      items: Array.from({ length: 41 }, (_, i) => ({
        ...line,
        productSlug: `san-pham-${i}`,
      })),
    });
    expect(loadBasket()).toEqual({ status: "discarded", reason: "malformed" });
  });
});

describe("save", () => {
  it("round-trips through storage", () => {
    const state = basketReducer(
      emptyBasket(FIXED),
      { type: "add", item: { ...line, quantity: 12 } },
      FIXED,
    ).state;

    expect(saveBasket(state)).toEqual({ status: "saved" });
    const outcome = loadBasket();
    if (outcome.status !== "loaded") throw new Error("expected loaded");
    expect(outcome.state.items[0]!.quantity).toBe(12);
  });

  it("rejects a payload over the byte cap instead of writing a partial one", () => {
    const huge: BasketState = {
      version: 1,
      updatedAt: FIXED().toISOString(),
      items: [{ ...line, availability: "available", note: "x".repeat(40_000) }],
    };

    expect(saveBasket(huge)).toEqual({ status: "rejected", reason: "too-large" });
    expect(window.localStorage.getItem(BASKET_STORAGE_KEY)).toBeNull();
  });

  it("measures the cap in encoded bytes, not code units", () => {
    // Vietnamese is multi-byte; `.length` would undercount by roughly a third.
    const viet = "ệ".repeat(MAX_SERIALIZED_BYTES / 2);
    const state: BasketState = {
      version: 1,
      updatedAt: FIXED().toISOString(),
      items: [{ ...line, availability: "available", note: viet }],
    };

    expect(viet.length).toBeLessThan(MAX_SERIALIZED_BYTES);
    expect(fitsWithinCap(state)).toBe(false);
  });

  it("reports unavailable rather than throwing when storage refuses", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    expect(saveBasket(emptyBasket(FIXED))).toEqual({ status: "unavailable" });
  });

  it("clears the stored basket", () => {
    saveBasket(emptyBasket(FIXED));
    clearBasket();
    expect(window.localStorage.getItem(BASKET_STORAGE_KEY)).toBeNull();
  });
});

describe("SSR safety", () => {
  it("produces a deterministic first state on both server and client", () => {
    // Section 4.1: the first server render and first client render must match,
    // so the initial value cannot depend on storage or on the current time.
    expect(initialBasket()).toEqual(initialBasket());
    expect(initialBasket().items).toEqual([]);
  });

  it("degrades to empty when window is absent", () => {
    vi.stubGlobal("window", undefined);
    expect(loadBasket()).toEqual({ status: "empty" });
    expect(saveBasket(emptyBasket(FIXED))).toEqual({ status: "unavailable" });
  });
});
