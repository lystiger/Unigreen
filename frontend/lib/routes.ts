import type { Locale } from "./types";

export function cataloguePath(locale: Locale): string {
  return locale === "vi" ? "/vi/san-pham" : "/en/products";
}

export function productPath(locale: Locale, slug: string): string {
  return `${cataloguePath(locale)}/${slug}`;
}
