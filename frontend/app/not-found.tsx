import Link from "next/link";
import { DEFAULT_LOCALE, HTML_LANG, getDictionary } from "@/lib/i18n";

/**
 * Fallback for requests that never reach a locale segment. The root layout
 * renders no markup, so this page owns the document element itself.
 */
export default function GlobalNotFound() {
  const dictionary = getDictionary(DEFAULT_LOCALE);

  return (
    <html lang={HTML_LANG[DEFAULT_LOCALE]}>
      <body className="flex min-h-screen items-center bg-paper font-sans text-ink antialiased">
        <div className="shell">
          <p className="font-mono text-eyebrow tracking-widest text-brand-green">404</p>
          <h1 className="mt-4 text-h1 font-bold">{dictionary.notFound.title}</h1>
          <p className="mt-4 max-w-xl text-lead text-ink-muted">
            {dictionary.notFound.body}
          </p>
          <Link
            href={`/${DEFAULT_LOCALE}`}
            className="mt-8 inline-flex rounded-control bg-brand-green px-6 py-3 text-lead font-medium text-white"
          >
            {dictionary.notFound.cta}
          </Link>
        </div>
      </body>
    </html>
  );
}
