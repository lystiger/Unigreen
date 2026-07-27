import { EmptyState } from "@/components/ui/EmptyState";
import type { PublicProduct } from "@/lib/api/types";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  readonly products: readonly PublicProduct[];
  readonly locale: Locale;
  readonly copy: Dictionary["products"];
  readonly basketCopy: Dictionary["basket"];
}

export function ProductGrid({ products, locale, copy, basketCopy }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <EmptyState
        title={copy.emptyTitle}
        body={copy.emptyBody}
        ctaHref={`/${locale}/inquiry`}
        ctaLabel={copy.emptyCta}
      />
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <li key={product.sku}>
          <ProductCard
            product={product}
            locale={locale}
            copy={copy}
            basketCopy={basketCopy}
          />
        </li>
      ))}
    </ul>
  );
}
