import { beforeEach, describe, expect, it } from "vitest";
import {
  basketReducer,
  clampQuantity,
  emptyBasket,
  hasUnavailable,
  submittableItems,
  type NewBasketItem,
  type PublishedProduct,
} from "@/lib/basket/reducer";
import { MAX_ITEMS, MAX_QUANTITY, type BasketState } from "@/lib/basket/types";

const FIXED = () => new Date("2026-07-27T00:00:00.000Z");

function product(n: number): NewBasketItem {
  return {
    productSlug: `san-pham-${n}`,
    sku: `UG-${n}`,
    name: `Giấy vệ sinh ${n}`,
  };
}

function add(state: BasketState, item: NewBasketItem): BasketState {
  return basketReducer(state, { type: "add", item }, FIXED).state;
}

let base: BasketState;
beforeEach(() => {
  base = emptyBasket(FIXED);
});

describe("add", () => {
  it("appends a line defaulting to one unit in cartons", () => {
    const next = add(base, product(1));
    expect(next.items).toHaveLength(1);
    // The public contract publishes no MOQ, so a line cannot start at one.
    expect(next.items[0]!.quantity).toBe(1);
    expect(next.items[0]!.unit).toBe("cartons");
    expect(next.items[0]!.availability).toBe("available");
  });

  it("keeps slug and sku, which are what submission sends", () => {
    const next = add(base, product(1));
    expect(next.items[0]!.productSlug).toBe("san-pham-1");
    expect(next.items[0]!.sku).toBe("UG-1");
  });

  it("honours an explicit quantity and unit", () => {
    const next = add(base, {
      ...product(1),
      quantity: 12,
      unit: "containers_40hc",
    });
    expect(next.items[0]!.quantity).toBe(12);
    expect(next.items[0]!.unit).toBe("containers_40hc");
  });

  it("increments an existing line rather than duplicating it", () => {
    const once = add(base, { ...product(1), quantity: 150 });
    const result = basketReducer(
      once,
      { type: "add", item: { ...product(1), quantity: 10 } },
      FIXED,
    );

    expect(result.state.items).toHaveLength(1);
    expect(result.state.items[0]!.quantity).toBe(160);
    // The toast has to say "increased", not "added", so the caller is told.
    expect(result.incremented).toBe(true);
  });

  it("treats the slug as the identity, not the sku", () => {
    const once = add(base, product(1));
    // Same slug, different sku — still the same line.
    const result = basketReducer(
      once,
      { type: "add", item: { ...product(1), sku: "UG-1-RENAMED" } },
      FIXED,
    );
    expect(result.state.items).toHaveLength(1);
    expect(result.incremented).toBe(true);
  });

  it("rejects the add at the item cap instead of truncating", () => {
    let state = base;
    for (let i = 0; i < MAX_ITEMS; i += 1) state = add(state, product(i));
    expect(state.items).toHaveLength(MAX_ITEMS);

    const result = basketReducer(state, { type: "add", item: product(999) }, FIXED);
    expect(result.rejection).toBe("item-cap-reached");
    expect(result.state.items).toHaveLength(MAX_ITEMS);
  });

  it("still increments an existing line once the cap is reached", () => {
    let state = base;
    for (let i = 0; i < MAX_ITEMS; i += 1) state = add(state, product(i));

    const result = basketReducer(state, { type: "add", item: product(0) }, FIXED);
    expect(result.rejection).toBeUndefined();
    expect(result.state.items).toHaveLength(MAX_ITEMS);
  });
});

describe("quantity", () => {
  it("clamps to the permitted range", () => {
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(-5)).toBe(1);
    expect(clampQuantity(1_000_000)).toBe(MAX_QUANTITY);
    expect(clampQuantity(12)).toBe(12);
  });

  it("floors non-integers and survives NaN", () => {
    expect(clampQuantity(7.9)).toBe(7);
    expect(clampQuantity(Number.NaN)).toBe(1);
    expect(clampQuantity(Number.POSITIVE_INFINITY)).toBe(1);
  });

  it("clamps through the setQuantity action", () => {
    const state = add(base, product(1));
    const result = basketReducer(
      state,
      { type: "setQuantity", productSlug: "san-pham-1", quantity: 10 ** 9 },
      FIXED,
    );
    expect(result.state.items[0]!.quantity).toBe(MAX_QUANTITY);
  });
});

describe("remove, setNote and unknown targets", () => {
  it("removes a line", () => {
    const state = add(add(base, product(1)), product(2));
    const result = basketReducer(
      state,
      { type: "remove", productSlug: "san-pham-1" },
      FIXED,
    );
    expect(result.state.items.map((l) => l.productSlug)).toEqual(["san-pham-2"]);
  });

  it("rejects rather than silently no-ops on an unknown product", () => {
    const state = add(base, product(1));
    for (const action of [
      { type: "remove", productSlug: "ghost" },
      { type: "setQuantity", productSlug: "ghost", quantity: 5 },
      { type: "setUnit", productSlug: "ghost", unit: "cartons" },
      { type: "setNote", productSlug: "ghost", note: "x" },
    ] as const) {
      expect(basketReducer(state, action, FIXED).rejection).toBe("unknown-item");
    }
  });

  it("normalises an empty note to null", () => {
    const state = add(base, product(1));
    const result = basketReducer(
      state,
      { type: "setNote", productSlug: "san-pham-1", note: "" },
      FIXED,
    );
    expect(result.state.items[0]!.note).toBeNull();
  });

  it("uses the injected clock for every mutating action", () => {
    // updateLine previously ignored the injected clock, so setQuantity and
    // friends stamped the real time while add and remove stamped the fake one.
    const state = add(base, product(1));
    const result = basketReducer(
      state,
      { type: "setQuantity", productSlug: "san-pham-1", quantity: 5 },
      FIXED,
    );
    expect(result.state.updatedAt).toBe(FIXED().toISOString());
  });
});

describe("reconcile", () => {
  const published = (n: number): PublishedProduct => ({
    productSlug: `san-pham-${n}`,
    sku: `UG-${n}-V2`,
    name: `Tên đã đổi ${n}`,
    imageUrl: "https://media.example/1.png",
  });

  it("refreshes the display cache from the live response", () => {
    const state = add(base, { ...product(1), quantity: 150 });
    const result = basketReducer(
      state,
      { type: "reconcile", published: [published(1)] },
      FIXED,
    );

    const line = result.state.items[0]!;
    expect(line.sku).toBe("UG-1-V2");
    expect(line.name).toBe("Tên đã đổi 1");
    expect(line.availability).toBe("available");
    // Identity and the buyer's own input both survive revalidation.
    expect(line.productSlug).toBe("san-pham-1");
    expect(line.quantity).toBe(150);
  });

  it("marks a product that is no longer published as unavailable", () => {
    const state = add(add(base, product(1)), product(2));
    const result = basketReducer(
      state,
      { type: "reconcile", published: [published(1)] },
      FIXED,
    );

    expect(result.state.items[1]!.availability).toBe("unavailable");
    expect(hasUnavailable(result.state)).toBe(true);
  });

  it("excludes unavailable lines from submission but keeps them visible", () => {
    const state = add(add(base, product(1)), product(2));
    const result = basketReducer(
      state,
      { type: "reconcile", published: [published(1)] },
      FIXED,
    );

    expect(result.state.items).toHaveLength(2);
    expect(submittableItems(result.state).map((l) => l.productSlug)).toEqual([
      "san-pham-1",
    ]);
  });

  it("can restore a line that became published again", () => {
    let state = add(base, product(1));
    state = basketReducer(state, { type: "reconcile", published: [] }, FIXED).state;
    expect(state.items[0]!.availability).toBe("unavailable");

    state = basketReducer(
      state,
      { type: "reconcile", published: [published(1)] },
      FIXED,
    ).state;
    expect(state.items[0]!.availability).toBe("available");
  });
});

describe("clear", () => {
  it("empties the basket", () => {
    const state = add(add(base, product(1)), product(2));
    const result = basketReducer(state, { type: "clear" }, FIXED);
    expect(result.state.items).toEqual([]);
    expect(result.state.version).toBe(1);
  });
});

describe("purity", () => {
  it("never mutates the state it was given", () => {
    const state = add(base, product(1));
    const snapshot = JSON.stringify(state);

    basketReducer(state, { type: "add", item: product(2) }, FIXED);
    basketReducer(state, { type: "remove", productSlug: "san-pham-1" }, FIXED);
    basketReducer(
      state,
      { type: "setQuantity", productSlug: "san-pham-1", quantity: 9 },
      FIXED,
    );
    basketReducer(state, { type: "reconcile", published: [] }, FIXED);
    basketReducer(state, { type: "clear" }, FIXED);

    expect(JSON.stringify(state)).toBe(snapshot);
  });
});
