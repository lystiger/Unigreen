import Link from "next/link";

interface SectionHeaderProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly lead?: string;
  /** Optional trailing link. Both href and label must be supplied together. */
  readonly linkHref?: string;
  readonly linkLabel?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  lead,
  linkHref,
  linkLabel,
}: SectionHeaderProps) {
  const hasLink = linkHref !== undefined && linkLabel !== undefined;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="font-mono text-eyebrow tracking-widest text-brand-green">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-h2 font-semibold text-ink">{title}</h2>
        {lead ? <p className="mt-3 text-lead text-ink-muted">{lead}</p> : null}
      </div>

      {hasLink ? (
        <Link
          href={linkHref}
          className="shrink-0 font-mono text-data text-brand-green underline-offset-4 hover:underline"
        >
          {linkLabel} <span aria-hidden="true">&rarr;</span>
        </Link>
      ) : null}
    </div>
  );
}
