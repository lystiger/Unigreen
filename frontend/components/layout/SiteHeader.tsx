"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BasketBadge } from "@/components/basket/BasketBadge";
import { LocaleCode } from "@/components/ui/LocaleCode";
import type { Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";
import { swapLocaleInPath } from "@/lib/i18n";
import { telHref } from "@/lib/format";

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

  // In-page anchors on the landing; prefixed with the locale so they resolve
  // (navigate home, then scroll) from any route the header is rendered on.
  const links = [
    { href: `/${locale}#products`, label: copy.products },
    { href: `/${locale}#manufacturing`, label: copy.manufacturing },
    { href: `/${locale}#oem`, label: copy.oem },
    { href: `/${locale}#quotation`, label: copy.contact },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/[0.92] backdrop-blur-[8px]">
      <div className="shell flex h-[68px] items-center justify-between gap-10">
        <Link href={`/${locale}#top`} className="flex items-center gap-2.5 text-ink">
          <Image src="/icon.svg" alt="" width={28} height={28} aria-hidden="true" />
          <span className="text-[19px] font-semibold tracking-[-0.02em]">
            Uni<span className="text-brand-green">-Green</span>
          </span>
        </Link>

        <nav aria-label={copy.products} className="hidden items-center gap-9 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[14px] text-ink-muted transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
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
              className="text-ink-faint transition-colors hover:text-ink"
            />
            <Link
              href={`/${locale}/inquiry`}
              className="inline-flex min-h-11 items-center rounded-control bg-brand-green px-[18px] text-[14px] font-medium text-white transition-colors hover:bg-brand-dark"
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
            className="min-h-11 rounded-control border border-line px-3 py-2 font-mono text-eyebrow tracking-[0.12em] text-ink lg:hidden"
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

            <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-4">
              <Link
                href={`/${locale}/inquiry`}
                onClick={() => setIsOpen(false)}
                className="flex min-h-11 items-center justify-center rounded-control bg-brand-green px-4 text-center text-[14px] font-medium text-white"
              >
                {copy.inquiry}
              </Link>
              <div className="flex items-center gap-4">
                {hotline ? (
                  <a
                    href={telHref(hotline)}
                    className="font-mono text-data text-ink-muted"
                  >
                    {copy.callUs}: {hotline}
                  </a>
                ) : null}
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
