import { ButtonLink } from "@/components/ui/Button";
import type { Locale, Product } from "@/lib/catalogue";
import type { Dictionary } from "@/lib/i18n";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  readonly products: readonly Product[];
  readonly locale: Locale;
  readonly copy: Dictionary["products"];
}

/**
 * Shared by the landing page, the catalogue and search results. The empty
 * state is part of the component rather than each caller so that an empty
 * catalogue never renders a bare grid.
 */
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
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} locale={locale} copy={copy} />
        </li>
      ))}
    </ul>
  );
}
