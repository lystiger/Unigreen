import { ButtonLink } from "@/components/ui/Button";
import { DEFAULT_LOCALE, getDictionary } from "@/lib/i18n";

/**
 * Rendered inside the locale layout. `notFound()` gives the boundary no params,
 * so the copy falls back to the default locale.
 */
export default function LocaleNotFound() {
  const dictionary = getDictionary(DEFAULT_LOCALE);

  return (
    <section className="shell flex flex-col items-start py-24 lg:py-32">
      <p className="font-mono text-eyebrow tracking-widest text-brand-green">404</p>
      <h1 className="mt-4 text-h1 font-bold text-ink">{dictionary.notFound.title}</h1>
      <p className="mt-4 max-w-xl text-lead text-ink-muted">
        {dictionary.notFound.body}
      </p>
      <div className="mt-8">
        <ButtonLink href={`/${DEFAULT_LOCALE}`} variant="primary" size="lg">
          {dictionary.notFound.cta}
        </ButtonLink>
      </div>
    </section>
  );
}
