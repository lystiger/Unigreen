interface StandardItem {
  readonly label: string;
  readonly value: string;
}

const ITEMS: readonly StandardItem[] = [
  { label: "Production", value: "Hưng Yên, Việt Nam" },
  { label: "Standard", value: "Japanese quality" },
  { label: "Supplied to", value: "Honda · Fushan Foxconn" },
  { label: "Service", value: "OEM / private label" },
];

/** The standards-and-supply strip beneath the hero. */
export function StandardsBar() {
  return (
    <section aria-label="Standards and supply" className="border-b border-line bg-paper-raised">
      <div className="shell grid grid-cols-2 md:grid-cols-4">
        {ITEMS.map((item, index) => (
          <div
            key={item.label}
            className={`py-7 ${
              index < ITEMS.length - 1 ? "md:border-r md:border-line md:pr-6" : ""
            } ${index > 0 ? "md:pl-6" : ""}`}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              {item.label}
            </p>
            <p className="mt-2 text-[16px] font-medium">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
