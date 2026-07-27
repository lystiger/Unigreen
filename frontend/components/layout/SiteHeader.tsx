"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BasketBadge } from "@/components/basket/BasketBadge";
import { LocaleCode } from "@/components/ui/LocaleCode";
import { cataloguePath } from "@/lib/routes";
import type { Locale } from "@/lib/types";
import { telHref } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { swapLocaleInPath } from "@/lib/i18n";

interface SiteHeaderProps {
  readonly locale: Locale;
  readonly copy: Dictionary["nav"];
  readonly hotline: string;
  readonly basketCopy: Dictionary["basket"];
}

export function SiteHeader({ locale, copy, hotline, basketCopy }: SiteHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const otherLocale: Locale = locale === "vi" ? "en" : "vi";

  const links = [{ href: cataloguePath(locale), label: copy.products }];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="shell flex h-16 items-center justify-between gap-6">
        <Link
          href={`/${locale}`}
          className="text-h3 font-semibold tracking-tight text-ink"
        >
          Uni<span className="text-brand-green">-Green</span>
        </Link>

        <nav aria-label={copy.products} className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-body text-ink-muted transition-colors hover:text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* One badge at every breakpoint. Rendering a desktop copy and a
            mobile copy would put two identically-labelled buttons in the
            accessibility tree, which a screen reader reads out twice however
            they are hidden visually. */}
        <div className="flex items-center gap-2 lg:gap-4">
          <BasketBadge copy={basketCopy} />

          <div className="hidden items-center gap-4 lg:flex">
            <LocaleCode
              href={swapLocaleInPath(pathname, otherLocale)}
              locale={otherLocale}
              label={copy.switchLocale}
              className="text-ink-muted transition-colors hover:text-ink"
            />
            <Link
              href={`/${locale}/inquiry`}
              className="inline-flex min-h-11 items-center rounded-control bg-brand-green px-4 py-2 text-body font-medium text-white transition-colors hover:bg-brand-dark"
            >
              {copy.inquiry}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-controls="site-menu"
            aria-label={isOpen ? copy.closeMenu : copy.openMenu}
            className="min-h-11 rounded-control border border-line px-3 py-2 font-mono text-eyebrow tracking-widest text-ink lg:hidden"
          >
            {isOpen ? copy.closeMenu : copy.openMenu}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div id="site-menu" className="border-t border-line bg-paper-raised lg:hidden">
          <nav aria-label={copy.products} className="shell py-4">
            <ul className="flex flex-col gap-1">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="flex min-h-11 items-center rounded-control px-2 py-3 text-lead text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
              <Link
                href={`/${locale}/inquiry`}
                onClick={() => setIsOpen(false)}
                className="flex min-h-11 items-center justify-center rounded-control bg-brand-green px-4 py-3 text-center text-body font-medium text-white"
              >
                {copy.inquiry}
              </Link>
              <div className="flex items-center justify-between">
                {hotline ? (
                  <a
                    href={telHref(hotline)}
                    className="font-mono text-data text-ink-muted"
                  >
                    {copy.callUs}: {hotline}
                  </a>
                ) : (
                  <span />
                )}
                <LocaleCode
                  href={swapLocaleInPath(pathname, otherLocale)}
                  locale={otherLocale}
                  label={copy.switchLocale}
                  onClick={() => setIsOpen(false)}
                  className="text-ink-muted"
                />
              </div>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
