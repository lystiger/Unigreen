import Link from "next/link";
import type { PublicProduct } from "@/lib/api/types";
import type { Dictionary } from "@/lib/i18n";
import { productPath } from "@/lib/routes";
import type { Locale } from "@/lib/types";

interface ProductCardProps {
  readonly product: PublicProduct;
  readonly locale: Locale;
  readonly copy: Dictionary["products"];
}

export function ProductCard({ product, locale, copy }: ProductCardProps) {
  const image =
    product.primary_media?.variants.find((item) => item.width >= 480) ??
    product.primary_media?.variants.at(-1);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-paper-raised transition-colors hover:border-line-strong">
      <div className="h-1 w-full bg-brand-green" aria-hidden="true" />
      <div className="flex aspect-[4/3] items-center justify-center bg-paper-sunk">
        {image && product.primary_media ? (
          // Dynamic media hosts are controlled by the backend contract.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={product.primary_media.alt_text}
            width={image.width}
            height={image.height}
            className="h-full w-full object-contain p-6"
          />
        ) : (
          <p className="px-6 text-center font-mono text-data text-ink-faint">
            {copy.imagePending}
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="font-mono text-eyebrow tracking-widest text-ink-faint">
          {product.sku}
        </p>
        <h3 className="mt-2 text-h3 font-medium text-ink">
          <Link
            href={productPath(locale, product.slug)}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {product.name}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-body text-ink-muted">{product.summary}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          {product.categories.map((category) => (
            <span
              key={category.slug}
              className="rounded-control bg-paper-sunk px-2 py-1 font-mono text-eyebrow text-ink-muted"
            >
              {category.name}
            </span>
          ))}
          {product.oem_available ? (
            <span className="rounded-control border border-line px-2 py-1 font-mono text-eyebrow text-ink-muted">
              {copy.oemBadge}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
