import Image from "next/image";
import Link from "next/link";
import type { Locale, Product, SkuLine } from "@/lib/catalogue";
import type { Dictionary } from "@/lib/i18n";

/** Accent is a product-line identifier, not a status colour. */
const LINE_ACCENT: Record<SkuLine, string> = {
  mega: "bg-sku-mega",
  family: "bg-sku-family",
  tissue: "bg-sku-tissue",
  oem: "bg-sku-oem",
};

interface ProductCardProps {
  readonly product: Product;
  readonly locale: Locale;
  readonly copy: Dictionary["products"];
}

function formatSpecLine(product: Product, locale: Locale): string {
  const { rollsPerPack, metresPerRoll, plies } = product.spec;
  const rollWord = locale === "vi" ? "cuộn" : "rolls";
  const plyWord = locale === "vi" ? "lớp" : "ply";
  const parts = [`${rollsPerPack} ${rollWord}`];

  if (metresPerRoll !== null) {
    parts.push(`${metresPerRoll} m`);
  }
  parts.push(`${plies} ${plyWord}`);

  return parts.join(" · ");
}

export function ProductCard({ product, locale, copy }: ProductCardProps) {
  const href = `/${locale}/products/${product.id}`;
  const name = product.name[locale];
  const moqValue = product.packing.minOrderCartons.toLocaleString(locale);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-paper-raised transition-colors hover:border-line-strong">
      <div className={`h-1 w-full ${LINE_ACCENT[product.line]}`} aria-hidden="true" />

      <div className="flex aspect-[4/3] items-center justify-center bg-paper-sunk">
        {product.imageSrc ? (
          <Image
            src={product.imageSrc}
            alt={name}
            width={400}
            height={300}
            className="h-full w-full object-contain p-6"
          />
        ) : (
          <p className="px-6 text-center font-mono text-data text-ink-faint">
            {copy.imagePending}
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 md:p-5">
        <p className="font-mono text-eyebrow tracking-widest text-ink-faint">
          {copy.lines[product.line] ?? product.line}
        </p>

        <h3 className="mt-2 text-h3 font-medium text-ink">
          <Link href={href} className="after:absolute after:inset-0 after:content-['']">
            {name}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-3 text-body text-ink-muted">
          {product.summary[locale]}
        </p>

        <p className="mt-3 font-mono text-data text-ink">
          {formatSpecLine(product, locale)}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          {product.spec.coreless ? (
            <span className="rounded-control bg-brand-tint px-2 py-1 font-mono text-eyebrow text-brand-dark">
              {copy.coreless}
            </span>
          ) : null}
          {product.oemAvailable ? (
            <span className="rounded-control border border-line px-2 py-1 font-mono text-eyebrow text-ink-muted">
              {copy.oemBadge}
            </span>
          ) : null}
          <span className="ml-auto font-mono text-data tabular-nums text-ink-muted">
            {copy.moq} {moqValue} {copy.cartons}
          </span>
        </div>
      </div>
    </article>
  );
}
