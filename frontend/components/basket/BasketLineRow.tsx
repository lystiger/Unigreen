"use client";

import Link from "next/link";
import { useState } from "react";
import type { BasketItem, QuantityUnit } from "@/lib/basket/types";
import type { Dictionary } from "@/lib/i18n";
import { getProductFallbackImage } from "@/lib/product-images";
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

function BasketThumbnail({
  source,
  fallback,
  detailed,
}: {
  readonly source: string;
  readonly fallback: string;
  readonly detailed: boolean;
}) {
  const [imgSrc, setImgSrc] = useState(source);

  return (
    <div
      className={`relative flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-control border border-line/60 bg-paper-sunk p-1.5 ${
        detailed ? "h-[72px] w-[72px] md:h-[88px] md:w-[88px]" : "h-16 w-16"
      }`}
    >
      {/* Runtime media host; see docs/adr/0004. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt=""
        width={detailed ? 88 : 64}
        height={detailed ? 88 : 64}
        loading="lazy"
        decoding="async"
        onError={() => {
          if (imgSrc !== fallback) {
            setImgSrc(fallback);
          } else if (imgSrc !== "/images/products/toilet-paper.webp") {
            setImgSrc("/images/products/toilet-paper.webp");
          }
        }}
        className="h-full w-full object-contain drop-shadow-xs"
      />
    </div>
  );
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

  const fallback = getProductFallbackImage({
    slug: line.productSlug,
    name: line.name,
  }).url;

  const preferredImage = line.imageUrl || fallback;

  return (
    <li
      className={[
        "rounded-card border border-line bg-paper-raised p-4 transition-colors",
        detailed
          ? "grid grid-cols-[72px_minmax(0,1fr)] gap-4 items-start md:grid-cols-[88px_minmax(0,1fr)]"
          : "flex flex-col gap-3",
        unavailable ? "opacity-70 bg-paper-sunk/50" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Top / Main product info section */}
      <div className={detailed ? "contents" : "flex items-start gap-3.5 min-w-0"}>
        {/* Product Image Thumbnail */}
        <BasketThumbnail
          key={preferredImage}
          source={preferredImage}
          fallback={fallback}
          detailed={detailed}
        />

        {/* Product Details (SKU, Title, Pack Option, Unavailable Warning, Notes) */}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-eyebrow tracking-widest text-ink-faint">
            {line.sku}
          </p>
          <h3 className="mt-0.5 text-body font-medium text-ink break-words">
            {unavailable ? (
              <span className="line-through text-ink-muted">{line.name}</span>
            ) : (
              <Link
                href={productPath(locale, line.productSlug)}
                className="underline-offset-4 hover:underline hover:text-brand-green transition-colors"
              >
                {line.name}
              </Link>
            )}
          </h3>

          {line.packOption ? (
            <p className="mt-1 font-mono text-data text-brand-dark">
              {copy.packSize}: {line.packOption}
            </p>
          ) : null}

          {unavailable ? (
            <p id={hintId} className="mt-1.5 text-data text-status-rejected">
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
      </div>

      {/* Controls: Quantity, Unit, and Remove Action */}
      <div
        className={
          detailed
            ? "col-span-full flex flex-wrap items-end justify-between gap-3 border-t border-line/60 pt-3 md:justify-start"
            : "pt-2.5 border-t border-line/60 flex flex-wrap items-end justify-between gap-3"
        }
      >
        {!unavailable ? (
          <div className="flex flex-wrap items-end gap-3">
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
                className="mt-1 block min-h-11 w-20 sm:w-24 rounded-control border border-line-strong bg-paper px-3 text-body tabular-nums"
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
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => {
            dispatch({ type: "remove", productSlug: line.productSlug });
            onRemoved?.();
          }}
          className="min-h-11 inline-flex items-center justify-center gap-1.5 rounded-control border border-line-strong px-3 py-2 text-data text-ink-muted transition-colors hover:border-status-rejected/40 hover:bg-status-rejected/10 hover:text-status-rejected"
          aria-label={`${copy.remove} ${line.name}`}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 opacity-70"
            aria-hidden="true"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          <span>{copy.remove}</span>
        </button>
      </div>
    </li>
  );
}
