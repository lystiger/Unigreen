"use client";

import Link from "next/link";
import type { BasketItem, QuantityUnit } from "@/lib/basket/types";
import type { Dictionary } from "@/lib/i18n";
import { productPath } from "@/lib/routes";
import type { Locale } from "@/lib/types";
import { useBasket } from "./BasketProvider";

interface BasketLineRowProps {
  readonly line: BasketItem;
  readonly locale: Locale;
  readonly copy: Dictionary["basket"];
  readonly onRemoved?: () => void;
  /** The full row shows a note field; the drawer summary does not. */
  readonly detailed?: boolean;
}

export function BasketLineRow({
  line,
  locale,
  copy,
  onRemoved,
  detailed = false,
}: BasketLineRowProps) {
  const { dispatch } = useBasket();
  const unavailable = line.availability === "unavailable";
  const hintId = `basket-hint-${line.productSlug}`;

  return (
    <li
      className={[
        "grid gap-4 rounded-card border border-line bg-paper-raised p-4",
        detailed ? "md:grid-cols-[88px_1fr_auto]" : "grid-cols-[64px_1fr]",
        unavailable ? "opacity-70" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex aspect-square items-center justify-center rounded-control bg-paper-sunk">
        {line.imageUrl !== null ? (
          // Runtime media host; see docs/adr/0004.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={line.imageUrl}
            alt=""
            width={88}
            height={88}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain p-1"
          />
        ) : (
          <span className="font-mono text-eyebrow text-ink-faint">{line.sku}</span>
        )}
      </div>

      <div className="min-w-0">
        <p className="font-mono text-eyebrow tracking-widest text-ink-faint">
          {line.sku}
        </p>
        <h3 className="mt-1 text-body font-medium text-ink">
          {/* A withdrawn product has no public page left to link to. */}
          {unavailable ? (
            <span className="line-through">{line.name}</span>
          ) : (
            <Link
              href={productPath(locale, line.productSlug)}
              className="underline-offset-4 hover:underline"
            >
              {line.name}
            </Link>
          )}
        </h3>

        {unavailable ? (
          <p id={hintId} className="mt-2 text-data text-status-rejected">
            {copy.unavailable} — {copy.unavailableHint}
          </p>
        ) : null}

        {detailed && !unavailable ? (
          <label className="mt-3 block text-data text-ink-muted">
            {copy.note}
            <input
              type="text"
              value={line.note ?? ""}
              placeholder={copy.notePlaceholder}
              onChange={(event) =>
                dispatch({
                  type: "setNote",
                  productSlug: line.productSlug,
                  note: event.target.value,
                })
              }
              className="mt-1 min-h-11 w-full rounded-control border border-line-strong bg-paper px-3 text-body"
            />
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap items-start gap-3">
        {!unavailable ? (
          <>
            <label className="text-data text-ink-muted">
              {copy.quantity}
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={99999}
                value={line.quantity}
                onChange={(event) =>
                  dispatch({
                    type: "setQuantity",
                    productSlug: line.productSlug,
                    quantity: Number(event.target.value),
                  })
                }
                className="mt-1 block min-h-11 w-24 rounded-control border border-line-strong bg-paper px-3 text-body tabular-nums"
              />
            </label>
            <label className="text-data text-ink-muted">
              {copy.unit}
              <select
                value={line.unit}
                onChange={(event) =>
                  dispatch({
                    type: "setUnit",
                    productSlug: line.productSlug,
                    unit: event.target.value as QuantityUnit,
                  })
                }
                className="mt-1 block min-h-11 rounded-control border border-line-strong bg-paper px-3 text-body"
              >
                <option value="cartons">{copy.unitCartons}</option>
                <option value="containers_40hc">{copy.unitContainers}</option>
              </select>
            </label>
          </>
        ) : null}

        <button
          type="button"
          onClick={() => {
            dispatch({ type: "remove", productSlug: line.productSlug });
            onRemoved?.();
          }}
          className="mt-5 min-h-11 rounded-control border border-line-strong px-3 py-2 text-data text-ink-muted transition-colors hover:text-ink"
        >
          {copy.remove}
        </button>
      </div>
    </li>
  );
}
