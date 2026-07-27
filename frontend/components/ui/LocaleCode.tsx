import Link from "next/link";
import type { Locale } from "@/lib/types";

interface LocaleCodeProps {
  readonly href: string;
  readonly locale: Locale;
  /** Localized accessible name, e.g. "Chuyển sang tiếng Anh". */
  readonly label: string;
  readonly onClick?: () => void;
  readonly className?: string;
}

/**
 * The language switch, and the only sanctioned `uppercase` in the app (P1-02).
 *
 * Uppercasing Vietnamese copy drives stacked diacritics into the cap height at
 * `text-eyebrow`'s 0.12em tracking. A locale code is two ASCII letters with no
 * diacritic, so it is exempt — but "is this string localized?" cannot be read
 * off a className, so the rule is enforced structurally instead: `uppercase`
 * lives here and nowhere else, and `tests/no-uppercase.test.ts` fails the build
 * if it reappears under `app/` or `components/`.
 */
export function LocaleCode({
  href,
  locale,
  label,
  onClick,
  className,
}: LocaleCodeProps) {
  return (
    <Link
      href={href}
      hrefLang={locale}
      aria-label={label}
      onClick={onClick}
      className={[
        "inline-flex min-h-11 items-center font-mono text-eyebrow uppercase tracking-widest",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {locale}
    </Link>
  );
}
