import Link from "next/link";
import Image from "next/image";
import type { Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

interface SiteFooterProps {
  readonly locale: Locale;
  readonly copy: Dictionary["footer"];
  readonly nav: Dictionary["nav"];
}

const PRODUCT_LINKS = [
  "Jumbo rolls",
  "Napkins",
  "Toilet paper & holders",
  "Coreless paper",
];

/** Site footer — ported from `Uni-Green Landing.dc.html`. */
export function SiteFooter({ locale }: SiteFooterProps) {
  const company = [
    { href: `/${locale}#manufacturing`, label: "Manufacturing" },
    { href: `/${locale}#factory`, label: "Factory" },
    { href: `/${locale}#oem`, label: "OEM / private label" },
  ];

  return (
    <footer className="bg-paper-raised">
      <div className="shell grid grid-cols-1 gap-10 pb-10 pt-16 md:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div>
          <div className="flex items-center gap-2.5">
            <Image src="/icon.svg" alt="" width={28} height={28} aria-hidden="true" />
            <p className="text-[19px] font-semibold tracking-[-0.02em]">
              Uni<span className="text-brand-green">-Green</span>
            </p>
          </div>
          <p className="mt-3 max-w-[32ch] text-[14px] leading-[1.6] text-ink-muted">
            Tissue and paper manufacturing, made to specification.
          </p>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            Products
          </p>
          <div className="mt-3.5 flex flex-col gap-2.5">
            {PRODUCT_LINKS.map((label) => (
              <Link
                key={label}
                href={`/${locale}#products`}
                className="text-[14px] text-ink-muted transition-colors hover:text-ink"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            Company
          </p>
          <div className="mt-3.5 flex flex-col gap-2.5">
            {company.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[14px] text-ink-muted transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            Contact
          </p>
          <div className="mt-3.5 flex flex-col gap-2.5 text-[14px]">
            <span className="text-ink-muted">Hưng Yên, Việt Nam</span>
            <span className="text-line-strong">Address line — to add</span>
            <span className="text-line-strong">Hotline — to add</span>
            <span className="text-line-strong">Email — to add</span>
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="shell flex flex-wrap items-center justify-between gap-4 py-5">
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
            © 2026 Uni-Green
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
            VI / EN
          </span>
        </div>
      </div>
    </footer>
  );
}
