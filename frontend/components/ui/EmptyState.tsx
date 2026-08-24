import type { ReactNode } from "react";
import { ButtonLink } from "./Button";

interface EmptyStateProps {
  readonly title: string;
  readonly body: string;
  /** Both must be supplied together, or neither. */
  readonly ctaHref?: string;
  readonly ctaLabel?: string;
  /** Secondary action, e.g. "clear filters" on a filtered-empty list. */
  readonly children?: ReactNode;
}

/**
 * Extracted from `ProductGrid` (Sprint 2 section 9). Section 11 requires an
 * empty state to explain the cause and offer the next action, so the CTA is
 * part of the component rather than left to each caller to remember.
 */
export function EmptyState({
  title,
  body,
  ctaHref,
  ctaLabel,
  children,
}: EmptyStateProps) {
  const hasCta = ctaHref !== undefined && ctaLabel !== undefined;

  return (
    <div className="rounded-card border border-dashed border-line-strong bg-paper-sunk px-6 py-16 text-center">
      <h3 className="text-h3 font-medium text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-body text-ink-muted">{body}</p>
      {hasCta || children ? (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {hasCta ? (
            <ButtonLink href={ctaHref} variant="primary">
              {ctaLabel}
            </ButtonLink>
          ) : null}
          {children}
        </div>
      ) : null}
    </div>
  );
}
