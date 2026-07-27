import { ButtonLink } from "@/components/ui/Button";
import type { Dictionary } from "@/lib/i18n";
import { cataloguePath } from "@/lib/routes";
import type { Locale } from "@/lib/types";

interface HeroProps {
  readonly locale: Locale;
  readonly copy: Dictionary["hero"];
}

export function Hero({ locale, copy }: HeroProps) {
  return (
    <section className="shell grid grid-cols-1 items-center gap-12 py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
      <div>
        <p className="font-mono text-eyebrow tracking-widest text-brand-green">
          {copy.eyebrow}
        </p>

        <h1 className="mt-5 text-h1 font-bold text-ink md:text-display">
          {copy.headline}
          <br />
          <span className="text-brand-green">{copy.headlineAccent}</span>
        </h1>

        <p className="mt-6 max-w-xl text-lead text-ink-muted">{copy.lead}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={`/${locale}/inquiry`} variant="primary" size="lg">
            {copy.primaryCta}
          </ButtonLink>
          <ButtonLink href={cataloguePath(locale)} variant="secondary" size="lg">
            {copy.secondaryCta}
          </ButtonLink>
        </div>
      </div>

      <div className="rounded-card border border-line bg-brand-tint p-10 lg:p-14">
        <p className="font-mono text-eyebrow tracking-widest text-brand-dark">
          Uni-Green
        </p>
        <p className="mt-5 text-h2 font-semibold text-ink">{copy.packAlt}</p>
      </div>
    </section>
  );
}
