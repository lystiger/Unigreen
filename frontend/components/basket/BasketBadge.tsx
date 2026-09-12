"use client";

import { useBasket } from "./BasketProvider";
import type { Dictionary } from "@/lib/i18n";

interface BasketBadgeProps {
  readonly copy: Dictionary["basket"];
}

/**
 * Header trigger and line count. The count sits in a polite live region so a
 * screen reader hears the basket change after an add without the focus moving
 * (section 9). Renders a stable shell before hydration so the server and the
 * first client render agree.
 */
export function BasketBadge({ copy }: BasketBadgeProps) {
  const { count, hydrated, openDrawer } = useBasket();

  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={copy.open}
      data-testid="basket-badge"
      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control border border-line px-2 py-2 text-[14px] text-ink transition-colors hover:bg-paper-sunk sm:gap-2 sm:px-3 sm:text-body"
    >
      <span aria-hidden="true">☰</span>
      <span>{copy.badgeLabel}</span>
      <span
        aria-live="polite"
        className="inline-flex min-w-6 justify-center rounded-control bg-brand-green px-2 font-mono text-data tabular-nums text-white"
      >
        {hydrated ? count : 0}
      </span>
    </button>
  );
}
