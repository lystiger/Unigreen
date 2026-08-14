import { ImageSlot } from "@/components/ui/ImageSlot";

interface Family {
  readonly index: string;
  readonly name: string;
  readonly vi: string;
  readonly body: string;
  readonly specLabel: string;
  readonly specValue: string;
  readonly slot: string;
}

const FAMILIES: readonly Family[] = [
  {
    index: "Family 01",
    name: "Jumbo rolls",
    vi: "Cuộn giấy jumbo",
    body: "Parent rolls converted to your width, basis weight and length.",
    specLabel: "SPECIFIED ON",
    specValue: "WIDTH · GSM · LENGTH · CORE Ø",
    slot: "Jumbo roll — pack shot",
  },
  {
    index: "Family 02",
    name: "Napkins",
    vi: "Khăn giấy ăn",
    body: "Folded napkins for food service, canteens and industrial supply.",
    specLabel: "SPECIFIED ON",
    specValue: "SIZE · PLY · FOLD · EMBOSS",
    slot: "Napkins — pack shot",
  },
  {
    index: "Family 03",
    name: "Toilet paper & holders",
    vi: "Giấy vệ sinh và hộp đựng",
    body: "Roll tissue supplied with matching dispensers for facility use.",
    specLabel: "SPECIFIED ON",
    specValue: "WIDTH · PLY · LENGTH · SHEET COUNT",
    slot: "Toilet paper & holder — pack shot",
  },
  {
    index: "Family 04",
    name: "Coreless paper",
    vi: "Giấy không lõi",
    body: "Wound without a core — more paper per roll, nothing to dispose of.",
    specLabel: "SPECIFIED ON",
    specValue: "WIDTH · PLY · LENGTH · DIAMETER",
    slot: "Coreless roll — pack shot",
  },
];

/** The product families grid. */
export function ProductFamilies() {
  return (
    <section id="products" className="border-b border-line bg-paper">
      <div className="shell py-24 lg:py-30">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-7">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand-green">
              03 / Products
            </p>
            <h2 className="mt-5 text-[clamp(32px,4vw,54px)] font-semibold leading-[1.05] tracking-[-0.03em]">
              What we produce
            </h2>
            <p className="mt-2.5 text-[20px] font-light tracking-[-0.015em] text-ink-faint">
              Sản phẩm của chúng tôi
            </p>
          </div>
          <p className="max-w-[38ch] text-[15px] leading-[1.6] text-ink-muted">
            Every family below is manufactured to the buyer&apos;s specification.
            Full specification sheets are issued with the quotation.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px border border-t-0 border-line bg-line sm:grid-cols-2">
          {FAMILIES.map((family) => (
            <article key={family.name} className="bg-paper-raised">
              <div className="relative aspect-[4/3] w-full bg-paper-sunk">
                <ImageSlot placeholder={family.slot} />
              </div>
              <div className="p-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                  {family.index}
                </p>
                <h3 className="mt-3 text-[26px] font-medium tracking-[-0.02em]">{family.name}</h3>
                <p className="mt-1 text-[16px] font-light text-ink-faint">{family.vi}</p>
                <p className="mt-4 text-[15px] leading-[1.6] text-ink-muted">{family.body}</p>
                <p className="mt-6 border-t border-line pt-4 font-mono text-[11px] tracking-[0.1em] text-ink-faint">
                  {family.specLabel}&nbsp;&nbsp;<span className="text-ink">{family.specValue}</span>
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
