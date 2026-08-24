import type { Locale } from "./types";

export function cataloguePath(locale: Locale): string {
  return locale === "vi" ? "/vi/san-pham" : "/en/products";
}

export function productPath(locale: Locale, slug: string): string {
  return `${cataloguePath(locale)}/${slug}`;
}

/** Localized slug pair, mirroring the catalogue (Sprint 2 section 8). */
export function basketPath(locale: Locale): string {
  return locale === "vi" ? "/vi/gio-hang" : "/en/basket";
}

export function inquiryPath(locale: Locale): string {
  return `/${locale}/inquiry`;
}
