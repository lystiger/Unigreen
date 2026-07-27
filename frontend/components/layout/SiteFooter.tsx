import Link from "next/link";
import { cataloguePath } from "@/lib/routes";
import type { Locale } from "@/lib/types";
import { telHref } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";

interface SiteFooterProps {
  readonly locale: Locale;
  readonly copy: Dictionary["footer"];
  readonly nav: Dictionary["nav"];
}

export function SiteFooter({ locale, copy, nav }: SiteFooterProps) {
  const links = [{ href: cataloguePath(locale), label: nav.products }];

  return (
    <footer className="border-t border-line bg-paper-raised py-12">
      <div className="shell grid grid-cols-1 gap-10 md:grid-cols-3">
        <div>
          <p className="text-h3 font-semibold tracking-tight text-ink">
            Uni<span className="text-brand-green">-Green</span>
          </p>
          <p className="mt-3 text-body text-ink">{copy.company}</p>
          {copy.address ? (
            <address className="mt-2 max-w-sm text-body not-italic text-ink-muted">
              {copy.address}
            </address>
          ) : null}
        </div>

        <nav aria-label={nav.products}>
          <ul className="flex flex-col gap-2">
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

        <div className="flex flex-col gap-2">
          {copy.hotline ? (
            <a
              href={telHref(copy.hotline)}
              className="font-mono text-data text-ink transition-colors hover:text-brand-green"
            >
              {copy.hotline}
            </a>
          ) : null}
          {copy.web ? (
            <a
              href={`https://${copy.web}`}
              className="font-mono text-data text-ink-muted transition-colors hover:text-brand-green"
            >
              {copy.web}
            </a>
          ) : null}
        </div>
      </div>

      <div className="shell mt-10 border-t border-line pt-6">
        <p className="font-mono text-data text-ink-faint">{copy.rights}</p>
      </div>
    </footer>
  );
}
