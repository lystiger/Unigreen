import Link from "next/link";
import Image from "next/image";
import { AddToBasketControl } from "@/components/basket/AddToBasketControl";
import type { PublicProduct } from "@/lib/api/types";
import type { Dictionary } from "@/lib/i18n";
import { productPath } from "@/lib/routes";
import type { Locale } from "@/lib/types";

interface ProductCardProps {
  readonly product: PublicProduct;
  readonly locale: Locale;
  readonly copy: Dictionary["products"];
  readonly basketCopy: Dictionary["basket"];
}

function getFallbackImage(product: PublicProduct): string {
  const text = `${product.slug} ${product.sku} ${product.name} ${product.categories.map((c) => c.slug).join(" ")}`.toLowerCase();
  if (text.includes("jumbo") || text.includes("jrt")) {
    return "/images/products/usable/cutouts/Gemini_Generated_Image_qtdxibqtdxibqtdx.png";
  }
  if (text.includes("napkin") || text.includes("khan") || text.includes("nk")) {
    return "/images/products/usable/cutouts/napkins1000.png";
  }
  if (text.includes("coreless") || text.includes("khong-loi") || text.includes("khong loi")) {
    return "/images/products/usable/cutouts/Gemini_Generated_Image_988hc6988hc6988h.png";
  }
  return "/images/products/usable/cutouts/Gemini_Generated_Image_ri79s5ri79s5ri79.png";
}

export function ProductCard({ product, locale, copy, basketCopy }: ProductCardProps) {
  const image =
    product.primary_media?.variants.find((item) => item.width >= 480) ??
    product.primary_media?.variants.at(-1);

  const fallbackSrc = getFallbackImage(product);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-paper-raised transition-all duration-300 hover:-translate-y-1 hover:border-brand-green/40 hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
      <div className="h-1 w-full bg-brand-green/30 transition-colors duration-300 group-hover:bg-brand-green" aria-hidden="true" />
      <div className="product-image-surface relative flex aspect-[4/3] items-center justify-center overflow-hidden p-6">
        {image && product.primary_media ? (
          // Runtime media host; see docs/adr/0004.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={product.primary_media.alt_text}
            width={image.width}
            height={image.height}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105 drop-shadow-[0_10px_20px_rgba(39,48,40,0.10)]"
          />
        ) : (
          <div className="relative flex h-full w-full flex-col items-center justify-center">
            <Image
              src={fallbackSrc}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-contain p-2 transition-transform duration-500 group-hover:scale-105 drop-shadow-[0_10px_20px_rgba(39,48,40,0.10)]"
            />
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-paper/90 px-2.5 py-0.5 font-mono text-[10px] text-ink-faint shadow-2xs backdrop-blur-xs">
              {copy.imagePending}
            </span>
          </div>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-paper/90 px-2 py-0.5 font-mono text-[10px] tracking-wider text-ink-muted backdrop-blur-xs transition-colors group-hover:bg-brand-green group-hover:text-white">
          {product.sku}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-h3 font-medium text-ink transition-colors group-hover:text-brand-green">
          <Link
            href={productPath(locale, product.slug)}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {product.name}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-ink-muted">{product.summary}</p>
        
        <div className="mt-auto pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
            <div className="flex flex-wrap gap-1.5">
              {product.categories.map((category) => (
                <span
                  key={category.slug}
                  className="rounded-control bg-paper-sunk px-2 py-0.5 font-mono text-[11px] text-ink-muted"
                >
                  {category.name}
                </span>
              ))}
              {product.oem_available ? (
                <span className="rounded-control border border-line-strong px-2 py-0.5 font-mono text-[11px] text-brand-dark">
                  {copy.oemBadge}
                </span>
              ) : null}
            </div>

            <span className="inline-flex items-center font-mono text-[12px] font-medium text-brand-green transition-transform duration-200 group-hover:translate-x-1">
              &rarr;
            </span>
          </div>
        </div>
        <div className="relative z-10 mt-4">
          <AddToBasketControl product={product} copy={basketCopy} compact />
        </div>
      </div>
    </article>
  );
}
