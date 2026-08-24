import Link from "next/link";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { productPath } from "@/lib/routes";
import type { Locale } from "@/lib/types";

interface Family {
  readonly index: string;
  readonly slug: string;
  readonly name: string;
  readonly vi: string;
  readonly body: string;
  readonly specLabel: string;
  readonly specValue: string;
  readonly slot: string;
  readonly image: string;
}

const FAMILIES: readonly Family[] = [
  {
    index: "FAMILY 01",
    slug: "jumbo-rolls",
    name: "Jumbo rolls",
    vi: "Cuộn giấy jumbo",
    body: "Parent rolls converted to your width, basis weight and length.",
    specLabel: "SPECIFIED ON",
    specValue: "WIDTH · GSM · LENGTH · CORE Ø",
    slot: "Jumbo roll — pack shot",
    image: "/images/products/jumbo-roll.webp",
  },
  {
    index: "FAMILY 02",
    slug: "napkins",
    name: "Napkins",
    vi: "Khăn giấy ăn",
    body: "Folded napkins for food service, canteens and industrial supply.",
    specLabel: "SPECIFIED ON",
    specValue: "SIZE · PLY · FOLD · EMBOSS",
    slot: "Napkins — pack shot",
    image: "/images/products/napkins.webp",
  },
  {
    index: "FAMILY 03",
    slug: "toilet-paper",
    name: "Toilet paper & holders",
    vi: "Giấy vệ sinh và hộp đựng",
    body: "Roll tissue supplied with matching dispensers for facility use.",
    specLabel: "SPECIFIED ON",
    specValue: "WIDTH · PLY · LENGTH · SHEET COUNT",
    slot: "Toilet paper & holder — pack shot",
    image: "/images/products/toilet-paper.webp",
  },
  {
    index: "FAMILY 04",
    slug: "coreless-paper",
    name: "Coreless paper",
    vi: "Giấy không lõi",
    body: "Wound without a core — more paper per roll, nothing to dispose of.",
    specLabel: "SPECIFIED ON",
    specValue: "WIDTH · PLY · LENGTH · DIAMETER",
    slot: "Coreless roll — pack shot",
    image: "/images/products/coreless.webp",
  },
];

/** The product families grid. */
export function ProductFamilies({ locale = "vi" }: { readonly locale?: Locale }) {
  return (
    <section id="products" className="border-b border-line bg-paper">
      <div className="shell py-24 lg:py-30">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-7">
          <div>
            <p className="font-mono text-[11px] tracking-[0.16em] text-brand-green">
              03 / PRODUCTS
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
            <Link
              key={family.slug}
              href={productPath(locale, family.slug)}
              className="group block bg-paper-raised transition-all duration-300 hover:bg-[#FAF9F5] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
            >
              <article className="h-full flex flex-col">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-paper-sunk">
                  <ImageSlot
                    src={family.image}
                    alt={`${family.name} — ${family.vi}`}
                    placeholder={family.slot}
                  />
                  <div className="absolute right-4 top-4 rounded-full bg-paper/80 px-2.5 py-1 text-[11px] font-mono tracking-wider text-ink-muted backdrop-blur-sm transition-colors group-hover:bg-brand-green group-hover:text-white">
                    {locale === "vi" ? "Xem quy cách →" : "View specs →"}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-8">
                  <p className="font-mono text-[10px] tracking-[0.16em] text-ink-faint">
                    {family.index}
                  </p>
                  <h3 className="mt-3 text-[26px] font-medium tracking-[-0.02em] text-ink transition-colors group-hover:text-brand-green">
                    {family.name}
                  </h3>
                  <p className="mt-1 text-[16px] font-light text-ink-faint">{family.vi}</p>
                  <p className="mt-4 text-[15px] leading-[1.6] text-ink-muted">{family.body}</p>
                  <div className="mt-auto pt-6">
                    <div className="flex items-center justify-between border-t border-line pt-4">
                      <p className="font-mono text-[11px] tracking-[0.1em] text-ink-faint">
                        {family.specLabel}&nbsp;&nbsp;<span className="text-ink font-medium">{family.specValue}</span>
                      </p>
                      <span className="font-mono text-[12px] font-medium text-brand-green transition-transform duration-200 group-hover:translate-x-1">
                        &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
