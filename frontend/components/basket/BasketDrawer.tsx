"use client";

import { useEffect, useRef } from "react";
import type { Dictionary } from "@/lib/i18n";
import { basketPath, cataloguePath, inquiryPath } from "@/lib/routes";
import type { Locale } from "@/lib/types";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { BasketLineRow } from "./BasketLineRow";
import { useBasket } from "./BasketProvider";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface BasketDrawerProps {
  readonly locale: Locale;
  readonly copy: Dictionary["basket"];
}

/**
 * Slide-over basket summary (section 10.2).
 *
 * Focus moves to the heading on open and returns to whatever opened it on
 * close, `Esc` closes, background scroll is locked, and Tab is trapped. A
 * drawer that leaks focus to the page behind it is unusable by keyboard —
 * you tab into content you cannot see.
 */
export function BasketDrawer({ locale, copy }: BasketDrawerProps) {
  const { state, count, isOpen, closeDrawer, revalidation, hydrated } = useBasket();
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    returnFocusTo.current = document.activeElement as HTMLElement | null;
    headingRef.current?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeDrawer();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusable === undefined || focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;

      // The heading holds focus on open via tabindex="-1" and is not in the
      // list, so shift-tabbing from it must be sent to the end explicitly.
      if (event.shiftKey && (active === first || active === headingRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      returnFocusTo.current?.focus();
    };
  }, [isOpen, closeDrawer]);

  if (!isOpen || !hydrated) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label={copy.close}
        tabIndex={-1}
        onClick={closeDrawer}
        className="absolute inset-0 cursor-default bg-ink/40"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="basket-drawer-heading"
        className="relative flex h-full w-full max-w-md flex-col border-l border-line bg-paper shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <h2
            id="basket-drawer-heading"
            ref={headingRef}
            tabIndex={-1}
            className="text-h3 font-semibold text-ink outline-none"
          >
            {copy.title}
          </h2>
          <button
            type="button"
            onClick={closeDrawer}
            className="min-h-11 rounded-control border border-line px-3 py-2 text-data text-ink-muted"
          >
            {copy.close}
          </button>
        </div>

        {revalidation === "stale" ? (
          <p
            role="status"
            className="border-b border-line px-5 py-3 text-data text-status-pending"
          >
            {copy.stale}
          </p>
        ) : null}

        <div className="flex-1 overflow-y-auto p-5">
          {count === 0 ? (
            <EmptyState
              title={copy.emptyTitle}
              body={copy.emptyBody}
              ctaHref={cataloguePath(locale)}
              ctaLabel={copy.emptyCta}
            />
          ) : (
            <ul data-testid="basket-lines" className="flex flex-col gap-4">
              {state.items.map((line) => (
                <BasketLineRow
                  key={line.productSlug}
                  line={line}
                  locale={locale}
                  copy={copy}
                />
              ))}
            </ul>
          )}
        </div>

        {count > 0 ? (
          <div className="border-t border-line p-5">
            <p className="text-data text-ink-muted">
              {copy.lineCount.replace("{count}", count.toLocaleString(locale))}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <ButtonLink href={inquiryPath(locale)} variant="primary" size="lg">
                {copy.requestQuotation}
              </ButtonLink>
              <ButtonLink href={basketPath(locale)} variant="secondary">
                {copy.viewBasket}
              </ButtonLink>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
