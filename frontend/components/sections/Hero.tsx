import { ButtonLink } from "@/components/ui/Button";
import type { Locale, Product } from "@/lib/catalogue";
import type { Dictionary } from "@/lib/i18n";
import { RollDiagram } from "./RollDiagram";

interface HeroProps {
  readonly locale: Locale;
  readonly copy: Dictionary["hero"];
  /** Drives the dimensioned drawing so the figures shown are always real.
   *  Null when the catalogue is empty — the drawing is then omitted. */
  readonly leadProduct: Product | null;
}

export function Hero({ locale, copy, leadProduct }: HeroProps) {
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
          <ButtonLink href={`/${locale}/products`} variant="secondary" size="lg">
            {copy.secondaryCta}
          </ButtonLink>
        </div>
      </div>

      {leadProduct ? (
        <div className="flex justify-center lg:justify-end">
          <RollDiagram
            sheetWidthMm={leadProduct.spec.sheetWidthMm}
            metresPerRoll={leadProduct.spec.metresPerRoll}
            isCoreless={leadProduct.spec.coreless}
            title={copy.packAlt}
          />
        </div>
      ) : null}
    </section>
  );
}
