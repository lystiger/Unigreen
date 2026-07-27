import { ButtonLink } from "@/components/ui/Button";
import type { PublicProduct } from "@/lib/api/types";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  readonly products: readonly PublicProduct[];
  readonly locale: Locale;
  readonly copy: Dictionary["products"];
}

export function ProductGrid({ products, locale, copy }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line-strong bg-paper-sunk px-6 py-16 text-center">
        <h3 className="text-h3 font-medium text-ink">{copy.emptyTitle}</h3>
        <p className="mx-auto mt-2 max-w-md text-body text-ink-muted">
          {copy.emptyBody}
        </p>
        <div className="mt-6 flex justify-center">
          <ButtonLink href={`/${locale}/inquiry`} variant="primary">
            {copy.emptyCta}
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <li key={product.sku}>
          <ProductCard product={product} locale={locale} copy={copy} />
        </li>
      ))}
    </ul>
  );
}
