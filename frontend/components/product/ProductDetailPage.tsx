"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { ApiClientError, apiRequest } from "@/lib/api/client";
import type { PublicProductDetail } from "@/lib/api/types";
import { AddToBasketControl } from "@/components/basket/AddToBasketControl";
import { getDictionary } from "@/lib/i18n";
import { cataloguePath } from "@/lib/routes";
import type { Locale } from "@/lib/types";
import { ApiErrorState, CatalogueSkeleton } from "../ui/AsyncState";

export function ProductDetailPage({
  locale,
  slug,
}: {
  readonly locale: Locale;
  readonly slug: string;
}) {
  const dictionary = getDictionary(locale);
  const copy = dictionary.productDetail;
  const basketCopy = dictionary.basket;
  const query = useQuery({
    queryKey: ["public-product", locale, slug],
    queryFn: () =>
      apiRequest<PublicProductDetail>(
        `/api/v1/public/products/${encodeURIComponent(slug)}?locale=${locale}`,
      ),
  });
  const [selected, setSelected] = useState(0);

  if (query.isPending) {
    return (
      <div className="shell py-16">
        <CatalogueSkeleton />
      </div>
    );
  }
  if (query.isError) {
    const error = query.error instanceof ApiClientError ? query.error : null;
    return (
      <div className="shell py-16">
        <ApiErrorState
          title={copy.unavailable}
          message={error?.message ?? copy.unavailable}
          requestId={error?.detail.request_id}
          retryLabel={copy.retry}
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  const product = query.data;
  const currentMedia = product.media[selected] ?? product.primary_media;
  const currentImage = currentMedia?.variants.at(-1);
  return (
    <article className="shell py-10 lg:py-16">
      <Link
        href={cataloguePath(locale)}
        className="text-body text-brand-dark underline"
      >
        {copy.back}
      </Link>
      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <section aria-label={copy.gallery}>
          <div className="flex aspect-square items-center justify-center rounded-card bg-paper-sunk">
            {currentMedia && currentImage ? (
              // Runtime media host; see docs/adr/0004.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentImage.url}
                alt={currentMedia.alt_text}
                width={currentImage.width}
                height={currentImage.height}
                // Above the fold and the page's LCP element, so it must not be
                // lazy — that would defer the largest paint by a round trip.
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-contain p-8"
              />
            ) : (
              <span className="font-mono text-data text-ink-faint">{copy.gallery}</span>
            )}
          </div>
          {product.media.length > 1 ? (
            <div className="mt-4 flex gap-3">
              {product.media.map((media, index) => (
                <button
                  key={`${media.alt_text}-${index}`}
                  type="button"
                  aria-label={media.alt_text}
                  aria-pressed={selected === index}
                  onClick={() => setSelected(index)}
                  className="h-16 w-20 rounded-control border border-line-strong bg-paper-sunk font-mono text-eyebrow"
                >
                  {index + 1}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <div>
          <p className="font-mono text-eyebrow tracking-widest text-ink-faint">
            {product.sku}
          </p>
          <h1 className="mt-3 text-h1 font-semibold text-ink">{product.name}</h1>
          <p className="mt-5 text-lead text-ink-muted">{product.summary}</p>
          {product.description ? (
            <p className="mt-5 whitespace-pre-line text-body text-ink-muted">
              {product.description}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-2">
            {product.categories.map((category) => (
              <span
                key={category.slug}
                className="rounded-control bg-brand-tint px-3 py-1 text-data text-brand-dark"
              >
                {category.name}
              </span>
            ))}
          </div>
          {product.oem_available ? (
            <p className="mt-6 font-medium text-ink">✓ {copy.oem}</p>
          ) : null}
          <div className="mt-8">
            <AddToBasketControl product={product} copy={basketCopy} />
          </div>
        </div>
      </div>

      <section className="mt-14 border-t border-line pt-10">
        <h2 className="text-h2 font-semibold text-ink">{copy.specifications}</h2>
        <dl className="mt-6 divide-y divide-line rounded-card border border-line bg-paper-raised">
          {product.specifications.map((specification) => (
            <div
              key={specification.key}
              className="grid gap-1 px-5 py-4 sm:grid-cols-2"
            >
              <dt className="font-medium text-ink">{specification.label}</dt>
              <dd className="font-mono text-data text-ink-muted">
                {specification.value}
                {specification.unit ? ` ${specification.unit}` : ""}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.summary,
            sku: product.sku,
          }).replace(/</g, "\\u003c"),
        }}
      />
    </article>
  );
}
