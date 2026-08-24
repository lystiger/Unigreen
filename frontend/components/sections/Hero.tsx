import { HeroRoll } from "@/components/three/HeroRoll";
import { HeroRollSvg } from "./HeroRollSvg";

/**
 * Landing hero — imported from `Uni-Green Landing.dc.html`.
 *
 * Content is bilingual-inline (English lead, Vietnamese subtitle) exactly as the
 * design specifies, so it renders identically for both locales. In-page CTAs
 * scroll to the products and quotation sections on the same page.
 *
 * The roll illustration is an interactive, floating 3D model on capable desktop
 * clients ({@link HeroRoll}), falling back to the original static SVG
 * ({@link HeroRollSvg}) on reduced-motion, touch/small screens, or no WebGL.
 */
export function Hero() {
  return (
    <section id="top" className="relative overflow-clip border-b border-line">
      <div className="shell relative z-10 grid min-h-[calc(100vh-68px)] grid-cols-1 items-center gap-12 lg:pointer-events-none lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="py-16 lg:py-20">
          <p className="font-mono text-[11px] tracking-[0.16em] text-brand-green">
            01 / Parent roll — Hưng Yên, Việt Nam
          </p>
          <h1 className="mt-7 text-balance text-[clamp(44px,5.6vw,80px)] font-semibold leading-[1.02] tracking-[-0.035em]">
            Paper products.
            <br />
            Made to specification.
          </h1>
          <p className="mt-5 text-[clamp(20px,2.2vw,30px)] font-light leading-[1.15] tracking-[-0.02em] text-ink-faint">
            Sản phẩm giấy.
            <br />
            Sản xuất theo quy cách.
          </p>
          <p className="mt-8 max-w-[44ch] text-[17px] leading-[1.6] text-ink-muted">
            Uni-Green converts parent jumbo rolls into finished tissue and paper
            products on our production line in Hưng Yên. Jumbo rolls, napkins, toilet
            paper and coreless paper — built to the specification you send us.
          </p>
          <div className="mt-9 flex flex-wrap gap-3 lg:pointer-events-auto">
            <a
              href="#quotation"
              className="rounded-[2px] bg-brand-green px-7 py-4 text-[16px] font-medium text-white transition-colors hover:bg-brand-dark"
            >
              Request quotation
            </a>
            <a
              href="#products"
              className="rounded-[2px] border border-line-strong bg-paper-raised px-7 py-4 text-[16px] font-medium text-ink transition-colors hover:bg-paper-sunk"
            >
              Explore products
            </a>
          </div>
        </div>

        <div className="hidden lg:block" aria-hidden="true" />
      </div>

      <div className="relative min-h-[520px] lg:absolute lg:inset-0 lg:z-0 lg:min-h-0">
        <HeroRoll fullBleed>
          <HeroRollSvg />
        </HeroRoll>
      </div>
    </section>
  );
}
