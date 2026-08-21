"use client";

import { useState } from "react";
import { toBasketItem } from "@/lib/basket/identity";
import type { QuantityUnit } from "@/lib/basket/types";
import type { PublicProduct, PublicProductDetail } from "@/lib/api/types";
import type { Dictionary } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useBasket } from "./BasketProvider";

/**
 * `matchMedia` is absent in jsdom and in some embedded webviews. The add has
 * already succeeded by the time this is consulted, so a throw here would strand
 * the buyer on a half-completed interaction. Falling back to "not narrow" keeps
 * the drawer closed, which is the harmless direction to be wrong in.
 */
function isNarrowViewport(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(max-width: 1023px)").matches;
}

interface AddToBasketControlProps {
  readonly product: PublicProduct | PublicProductDetail;
  readonly copy: Dictionary["basket"];
  /** Detail pages show quantity and unit; cards show a bare add button. */
  readonly compact?: boolean;
}

/**
 * Section 10.1. Used on the product card and the detail page.
 *
 * The drawer opens on mobile but not on desktop: the header badge is the
 * feedback on a wide screen, and interrupting with a slide-over after every
 * add would fight a buyer assembling a long list. On a narrow screen the badge
 * is easy to miss, so the drawer is the confirmation.
 */
export function AddToBasketControl({
  product,
  copy,
  compact = false,
}: AddToBasketControlProps) {
  const { dispatch, openDrawer } = useBasket();
  const { show } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<QuantityUnit>("cartons");

  const add = () => {
    const result = dispatch({
      type: "add",
      item: toBasketItem(product, { quantity, unit }),
    });

    if (result.rejection === "item-cap-reached") {
      show(copy.capReached, "warning");
      return;
    }

    show(result.incremented === true ? copy.increased : copy.added);

    if (isNarrowViewport()) {
      openDrawer();
    }
  };

  if (compact) {
    return (
      <Button type="button" onClick={add} size="md">
        {copy.add}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-data text-ink-muted">
        {copy.quantity}
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={99999}
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
          className="mt-1 block min-h-11 w-28 rounded-control border border-line-strong bg-paper px-3 text-body tabular-nums"
        />
      </label>
      <label className="text-data text-ink-muted">
        {copy.unit}
        <select
          value={unit}
          onChange={(event) => setUnit(event.target.value as QuantityUnit)}
          className="mt-1 block min-h-11 rounded-control border border-line-strong bg-paper px-3 text-body"
        >
          <option value="cartons">{copy.unitCartons}</option>
          <option value="containers_40hc">{copy.unitContainers}</option>
        </select>
      </label>
      <Button type="button" onClick={add} size="lg">
        {copy.add}
      </Button>
    </div>
  );
}
