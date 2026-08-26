import { ImageSlot } from "@/components/ui/ImageSlot";

interface Tile {
  readonly slot: string;
  readonly className: string;
  readonly image: string;
}

const TILES: readonly Tile[] = [
  {
    slot: "Main production line",
    className: "aspect-[16/9] md:col-span-2",
    image: "/images/factory/production-line.webp",
  },
  {
    slot: "Rewinder / converting detail",
    className: "aspect-[16/9]",
    image: "/images/factory/factory-floor.webp",
  },
  {
    slot: "Jumbo roll storage",
    className: "aspect-[4/3]",
    image: "/images/factory/jumbo-storage.webp",
  },
  {
    slot: "Packing and labelling",
    className: "aspect-[4/3]",
    image: "/images/factory/packing-labelling.webp",
  },
  {
    slot: "Quality check",
    className: "aspect-[4/3]",
    image: "/images/factory/quality-check.webp",
  },
  {
    slot: "Factory exterior",
    className: "aspect-[16/9] md:col-span-2",
    image: "/images/factory/IMG_1529.webp",
  },
];

/** Factory photo grid — a dark break in the page. */
export function FactoryGallery() {
  return (
    <section id="factory" className="bg-ink text-paper">
      <div className="shell pb-10 pt-24 lg:pt-30">
        <p className="font-mono text-[11px] tracking-[0.16em] text-brand-green">
          05 / FACTORY
        </p>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-[clamp(32px,4vw,54px)] font-semibold leading-[1.05] tracking-[-0.03em]">
              Where it is made
            </h2>
            <p className="mt-2.5 text-[20px] font-light tracking-[-0.015em] text-ink-muted">
              Nơi sản xuất
            </p>
          </div>
          <p className="max-w-[38ch] text-[15px] leading-[1.6] text-[#8FA096]">
            Buyers are welcome to visit the site. These are real photographs from
            the Hưng Yên production line.
          </p>
        </div>
      </div>

      <div className="shell grid grid-cols-1 gap-4 pb-24 md:grid-cols-3 lg:pb-30">
        {TILES.map((tile) => (
          <div key={tile.slot} className={`relative overflow-hidden rounded-control bg-[#14261C] ${tile.className}`}>
            <ImageSlot
              src={tile.image}
              alt={tile.slot}
              placeholder={tile.slot}
              tone="dark"
              objectFit="cover"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
