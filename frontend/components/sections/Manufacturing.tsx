import { ImageSlot } from "@/components/ui/ImageSlot";

interface Detail {
  readonly label: string;
  readonly value: string;
  readonly body: string;
}

const DETAILS: readonly Detail[] = [
  {
    label: "Location",
    value: "Hưng Yên, Việt Nam",
    body: "A single production site in the northern industrial belt, within reach of Hà Nội and Hải Phòng port.",
  },
  {
    label: "Standard",
    value: "Japanese quality",
    body: "The line is operated to a Japanese quality standard, applied consistently across every run.",
  },
  {
    label: "Supply",
    value: "Honda · Fushan Foxconn",
    body: "We supply paper to manufacturing operations that audit their suppliers, alongside distributors and facility buyers.",
  },
  {
    label: "In-house",
    value: "Converting to finished pack",
    body: "Unwinding, converting, cutting, folding, rewinding and packing all happen on our own line.",
  },
];

/** Manufacturing section — sticky intro beside a list of production facts. */
export function Manufacturing() {
  return (
    <section id="manufacturing" className="border-b border-line bg-paper-raised">
      <div className="shell py-24 lg:py-30">
        <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="lg:sticky lg:top-30">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand-green">
              04 / Manufacturing
            </p>
            <h2 className="mt-5 text-[clamp(32px,4vw,54px)] font-semibold leading-[1.05] tracking-[-0.03em]">
              One line.
              <br />
              Run properly.
            </h2>
            <p className="mt-2.5 text-[20px] font-light tracking-[-0.015em] text-ink-faint">
              Một dây chuyền, vận hành đúng chuẩn.
            </p>
            <p className="mt-7 max-w-[42ch] text-[16px] leading-[1.65] text-ink-muted">
              Uni-Green is a small manufacturer. Our production line sits in Hưng
              Yên and runs to a Japanese quality standard — the reason industrial
              buyers such as Honda and Fushan Foxconn source their paper from us.
            </p>
          </div>

          <div className="flex flex-col border-t border-line">
            {DETAILS.map((detail) => (
              <div
                key={detail.label}
                className="grid grid-cols-[120px_minmax(0,1fr)] gap-6 border-b border-line py-7"
              >
                <span className="pt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                  {detail.label}
                </span>
                <div>
                  <p className="text-[20px] font-medium tracking-[-0.015em]">{detail.value}</p>
                  <p className="mt-1.5 text-[15px] leading-[1.6] text-ink-muted">{detail.body}</p>
                </div>
              </div>
            ))}
            <div className="relative mt-8 aspect-[16/10] w-full bg-paper-sunk">
              <ImageSlot placeholder="Production line — Hưng Yên" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
