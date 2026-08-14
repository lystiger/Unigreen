interface Step {
  readonly index: string;
  readonly title: string;
  readonly body: string;
}

const STEPS: readonly Step[] = [
  { index: "01", title: "Dimensions", body: "Width, length, diameter, sheet count, core size or none at all." },
  { index: "02", title: "Ply & substrate", body: "Number of plies, basis weight and embossing pattern." },
  { index: "03", title: "Packaging", body: "Wrap, units per pack, cartons per pallet, labelling and barcodes." },
  { index: "04", title: "Branding", body: "Your artwork printed on the product, the wrap or the carton." },
];

/** OEM / private-label section. */
export function OemBand() {
  return (
    <section id="oem" className="border-b border-line bg-paper-sunk">
      <div className="shell py-24 lg:py-30">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand-green">
          06 / OEM &amp; private label
        </p>
        <div className="mt-7 grid grid-cols-1 items-start gap-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div>
            <h2 className="text-[clamp(38px,5vw,72px)] font-semibold leading-[1.02] tracking-[-0.035em]">
              Your paper.
              <br />
              Your specification.
              <br />
              Your brand.
            </h2>
            <p className="mt-5 text-[clamp(18px,2vw,26px)] font-light leading-[1.2] tracking-[-0.02em] text-ink-faint">
              Giấy của bạn. Quy cách của bạn. Thương hiệu của bạn.
            </p>
            <p className="mt-8 max-w-[46ch] text-[16px] leading-[1.65] text-ink-muted">
              Send us what the product needs to be and we will manufacture it under
              your label. Nothing about the specification is fixed until you fix it.
            </p>
            <a
              href="#quotation"
              className="mt-8 inline-block rounded-[2px] bg-ink px-7 py-4 text-[16px] font-medium text-white transition-colors hover:bg-brand-dark"
            >
              Discuss an OEM order
            </a>
          </div>

          <div className="border-t border-line-strong">
            {STEPS.map((step) => (
              <div
                key={step.index}
                className="grid grid-cols-[44px_minmax(0,1fr)] gap-5 border-b border-line-strong py-6"
              >
                <span className="font-mono text-[11px] text-brand-green">{step.index}</span>
                <div>
                  <p className="text-[17px] font-medium">{step.title}</p>
                  <p className="mt-1.5 text-[15px] leading-[1.55] text-ink-muted">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
