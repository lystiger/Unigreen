import { ButtonLink } from "@/components/ui/Button";
import type { Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";
import { telHref } from "@/lib/format";

interface InquiryBandProps {
  readonly locale: Locale;
  readonly copy: Dictionary["inquiry"];
  /** Displayed as written; dialled through a normalised tel: URI. */
  readonly hotline: string;
}

/** Closing call to action, repeated on every page except the inquiry form. */
export function InquiryBand({ locale, copy, hotline }: InquiryBandProps) {
  return (
    <section className="bg-brand-dark py-16 lg:py-20">
      <div className="shell flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-h2 font-semibold text-white">{copy.title}</h2>
          <p className="mt-3 text-lead text-brand-tint">{copy.body}</p>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 sm:flex-row sm:items-center">
          <ButtonLink href={`/${locale}/inquiry`} variant="secondary" size="lg">
            {copy.cta}
          </ButtonLink>
          {hotline ? (
            <p className="text-body text-brand-tint">
              {copy.orCall}{" "}
              <a
                href={telHref(hotline)}
                className="font-mono text-data text-white underline-offset-4 hover:underline"
              >
                {hotline}
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
