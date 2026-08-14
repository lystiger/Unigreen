"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";
import { LOCALES, swapLocaleInPath } from "@/lib/i18n";

interface SiteHeaderProps {
  readonly locale: Locale;
  readonly copy: Dictionary["nav"];
  readonly hotline: string;
}

export function SiteHeader({ locale, copy }: SiteHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

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
        <Link href={`/${locale}#top`} className="flex items-baseline gap-2.5 text-ink">
          <span className="text-[19px] font-semibold tracking-[-0.02em]">
            Uni<span className="text-brand-green">-Green</span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            Hưng Yên · VN
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

        <div className="flex items-center gap-5">
          <div className="hidden items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] sm:flex">
            {LOCALES.map((candidate, index) => (
              <span key={candidate} className="flex items-center gap-1.5">
                {index > 0 ? <span className="text-line-strong">/</span> : null}
                {candidate === locale ? (
                  <span className="text-ink">{candidate}</span>
                ) : (
                  <Link
                    href={swapLocaleInPath(pathname, candidate)}
                    hrefLang={candidate}
                    aria-label={copy.switchLocale}
                    className="text-ink-faint transition-colors hover:text-ink"
                  >
                    {candidate}
                  </Link>
                )}
              </span>
            ))}
          </div>

          <Link
            href={`/${locale}#quotation`}
            className="hidden rounded-[2px] bg-brand-green px-[18px] py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-brand-dark sm:inline-block"
          >
            {copy.inquiry}
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-controls="site-menu"
            aria-label={isOpen ? copy.closeMenu : copy.openMenu}
            className="rounded-[2px] border border-line px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink lg:hidden"
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
                    className="block rounded-[2px] px-2 py-3 text-lead text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-4">
              <Link
                href={`/${locale}#quotation`}
                onClick={() => setIsOpen(false)}
                className="rounded-[2px] bg-brand-green px-4 py-3 text-center text-[14px] font-medium text-white"
              >
                {copy.inquiry}
              </Link>
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em]">
                {LOCALES.map((candidate, index) => (
                  <span key={candidate} className="flex items-center gap-2">
                    {index > 0 ? <span className="text-line-strong">/</span> : null}
                    {candidate === locale ? (
                      <span className="text-ink">{candidate}</span>
                    ) : (
                      <Link
                        href={swapLocaleInPath(pathname, candidate)}
                        hrefLang={candidate}
                        aria-label={copy.switchLocale}
                        onClick={() => setIsOpen(false)}
                        className="text-ink-faint"
                      >
                        {candidate}
                      </Link>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
