import { ButtonLink } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

interface OemProcessProps {
  readonly locale: Locale;
  readonly copy: Dictionary["oem"];
}

/**
 * The private-label pitch, as an ordered list because the steps are sequential
 * and a buyer skimming with a screen reader needs that order announced.
 */
export function OemProcess({ locale, copy }: OemProcessProps) {
  return (
    <section id="oem" className="border-y border-line bg-paper-sunk py-16 lg:py-24">
      <div className="shell">
        <SectionHeader eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />

        <ol className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {copy.steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-card border border-line bg-paper-raised p-6"
            >
              <span className="font-mono text-eyebrow tracking-widest text-brand-green">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-h3 font-medium text-ink">{step.title}</h3>
              <p className="mt-2 text-body text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10">
          <ButtonLink href={`/${locale}/inquiry`} variant="primary" size="lg">
            {copy.cta}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
