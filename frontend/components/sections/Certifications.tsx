import { SectionHeader } from "@/components/ui/SectionHeader";
import type { Dictionary } from "@/lib/i18n";

interface CertificationsProps {
  readonly copy: Dictionary["capability"];
}

/**
 * Certification codes are rendered as text, not logos. The mill has supplied
 * no certification marks, and reproducing an ISO logo without the certificate
 * on file would be a claim we cannot back.
 */
export function Certifications({ copy }: CertificationsProps) {
  return (
    <section id="capability" className="py-16 lg:py-24">
      <div className="shell">
        <SectionHeader eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />

        <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {copy.certifications.map((certification) => (
            <li
              key={certification.code}
              className="rounded-card border border-line bg-paper-raised p-6"
            >
              <p className="font-mono text-h3 font-medium tabular-nums text-ink">
                {certification.code}
              </p>
              <p className="mt-2 text-body text-ink-muted">{certification.label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
