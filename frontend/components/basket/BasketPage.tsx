"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiRequest, queryString } from "@/lib/api/client";
import type { PublicProductPage } from "@/lib/api/types";
import { toPublishedProduct } from "@/lib/basket/identity";
import { getDictionary } from "@/lib/i18n";
import { cataloguePath, inquiryPath } from "@/lib/routes";
import type { Locale } from "@/lib/types";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CatalogueSkeleton } from "@/components/ui/AsyncState";
import { BasketLineRow } from "./BasketLineRow";
import { useBasket } from "./BasketProvider";

/**
 * Full basket page (section 8), and the place revalidation runs (section 4.2).
 *
 * The published contract has no bulk product lookup, so the basket is
 * reconciled against a page of the public catalogue rather than against its
 * own line slugs. That is only correct while the catalogue fits in one page —
 * see docs/UniGreen_Sprint_2_API_Request.md, open question 6. When a slug
 * filter exists this query changes and nothing else does.
 */
export function BasketPage({ locale }: { readonly locale: Locale }) {
  const dictionary = getDictionary(locale);
  const copy = dictionary.basket;
  const { state, count, hydrated, reconcile, markRevalidation, revalidation } =
    useBasket();

  const published = useQuery({
    queryKey: ["basket-revalidate", locale],
    enabled: hydrated && count > 0,
    queryFn: () =>
      apiRequest<PublicProductPage>(
        `/api/v1/public/products?${queryString({ locale, page: 1, page_size: 100 })}`,
      ),
  });

  useEffect(() => {
    if (published.isPending) {
      markRevalidation("checking");
      return;
    }
    if (published.isError) {
      // Section 4.2: keep the stored snapshot, say so, and still allow
      // submission — the backend revalidates authoritatively.
      markRevalidation("stale");
      return;
    }
    if (published.data !== undefined) {
      reconcile(published.data.items.map(toPublishedProduct));
      markRevalidation("fresh");
    }
  }, [
    published.isPending,
    published.isError,
    published.data,
    reconcile,
    markRevalidation,
  ]);

  if (!hydrated) {
    return (
      <div className="shell py-16">
        <CatalogueSkeleton />
      </div>
    );
  }

  return (
    <section className="shell py-12 lg:py-20">
      <p className="font-mono text-eyebrow tracking-widest text-brand-green">
        {dictionary.catalogue.eyebrow}
      </p>
      <h1 className="mt-3 text-h1 font-semibold text-ink">{copy.title}</h1>

      <p role="status" aria-live="polite" className="mt-4 text-data text-ink-muted">
        {revalidation === "checking"
          ? copy.revalidating
          : copy.lineCount.replace("{count}", count.toLocaleString(locale))}
      </p>

      {revalidation === "stale" ? (
        <p
          role="status"
          className="mt-4 rounded-card border border-line bg-paper-sunk px-4 py-3 text-data text-status-pending"
        >
          {copy.stale}
        </p>
      ) : null}

      <div className="mt-8">
        {count === 0 ? (
          <EmptyState
            title={copy.emptyTitle}
            body={copy.emptyBody}
            ctaHref={cataloguePath(locale)}
            ctaLabel={copy.emptyCta}
          />
        ) : (
          <>
            <ul data-testid="basket-lines" className="flex flex-col gap-4">
              {state.items.map((line) => (
                <BasketLineRow
                  key={line.productSlug}
                  line={line}
                  locale={locale}
                  copy={copy}
                  detailed
                />
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-6">
              <ButtonLink href={inquiryPath(locale)} variant="primary" size="lg">
                {copy.requestQuotation}
              </ButtonLink>
              <ButtonLink href={cataloguePath(locale)} variant="secondary" size="lg">
                {copy.continueShopping}
              </ButtonLink>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
