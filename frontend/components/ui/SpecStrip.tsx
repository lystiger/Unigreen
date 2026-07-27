export interface SpecStripItem {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

interface SpecStripProps {
  /** Accessible name for the strip, e.g. "Production specifications". */
  readonly label: string;
  readonly items: readonly SpecStripItem[];
}

/**
 * Horizontal band of manufacturing figures. Values are mono because they are
 * technical data, not prose. Reused under the landing hero and at the top of
 * every product detail page.
 */
export function SpecStrip({ label, items }: SpecStripProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section aria-label={label} className="border-y border-line bg-paper-raised">
      <dl className="shell grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col justify-center py-5 lg:py-6">
            <dt className="font-mono text-eyebrow tracking-widest text-ink-faint">
              {item.label}
            </dt>
            <dd className="mt-1 font-mono text-h3 font-medium tabular-nums text-ink">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
