/**
 * Landing hero — imported from `Uni-Green Landing.dc.html`.
 *
 * Content is bilingual-inline (English lead, Vietnamese subtitle) exactly as the
 * design specifies, so it renders identically for both locales. In-page CTAs
 * scroll to the products and quotation sections on the same page.
 */
export function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-clip border-b border-line"
    >
      <div className="shell grid min-h-[calc(100vh-68px)] grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="py-16 lg:py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand-green">
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
            products on our production line in Hưng Yên. Jumbo rolls, napkins,
            toilet paper and coreless paper — built to the specification you send
            us.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
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

        <div className="relative flex min-h-[520px] items-center justify-center self-stretch">
          <svg
            viewBox="0 0 760 520"
            className="h-auto w-[112%] max-w-none overflow-visible"
            role="img"
            aria-label="Parent jumbo roll, cut to a specified face width"
          >
            <defs>
              <linearGradient id="ugBody" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#EFEDE6" />
                <stop offset="0.28" stopColor="#FFFFFF" />
                <stop offset="0.62" stopColor="#FAF9F5" />
                <stop offset="1" stopColor="#E6E3DA" />
              </linearGradient>
              <linearGradient id="ugFace" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#FFFFFF" />
                <stop offset="1" stopColor="#EDEAE2" />
              </linearGradient>
              <linearGradient id="ugSheet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#FFFFFF" />
                <stop offset="1" stopColor="#F4F2EC" />
              </linearGradient>
            </defs>

            <path
              d="M160 470 C 300 470, 330 500, 470 500 C 610 500, 660 476, 700 470 L 700 486 C 640 494, 600 516, 470 516 C 340 516, 300 486, 160 486 Z"
              fill="url(#ugSheet)"
              stroke="#CBC8BE"
              strokeWidth="1"
            />

            <ellipse cx="590" cy="250" rx="86" ry="200" fill="#E6E3DA" stroke="#CBC8BE" strokeWidth="1" />
            <rect x="180" y="50" width="410" height="400" fill="url(#ugBody)" />
            <line x1="180" y1="50" x2="590" y2="50" stroke="#CBC8BE" strokeWidth="1" />
            <line x1="180" y1="450" x2="590" y2="450" stroke="#CBC8BE" strokeWidth="1" />

            <g style={{ transformOrigin: "180px 250px" }}>
              <ellipse cx="180" cy="250" rx="86" ry="200" fill="url(#ugFace)" stroke="#0C1B14" strokeWidth="1.4" />
              <ellipse cx="180" cy="250" rx="70" ry="163" fill="none" stroke="#E2E0D9" strokeWidth="1" />
              <ellipse cx="180" cy="250" rx="55" ry="128" fill="none" stroke="#E2E0D9" strokeWidth="1" />
              <ellipse cx="180" cy="250" rx="41" ry="95" fill="none" stroke="#E2E0D9" strokeWidth="1" />
              <ellipse cx="180" cy="250" rx="27" ry="63" fill="none" stroke="#E2E0D9" strokeWidth="1" />
              <ellipse cx="180" cy="250" rx="15" ry="35" fill="#F4F2EC" stroke="#CBC8BE" strokeWidth="1" />
              <line x1="180" y1="215" x2="180" y2="50" stroke="#1E9445" strokeWidth="1.6" />
            </g>

            <g stroke="#CBC8BE" strokeWidth="1" fill="none">
              <line x1="180" y1="20" x2="180" y2="38" strokeDasharray="3 3" />
              <line x1="590" y1="20" x2="590" y2="38" strokeDasharray="3 3" />
              <line x1="180" y1="29" x2="590" y2="29" />
            </g>
            <text
              x="385"
              y="20"
              textAnchor="middle"
              fill="#8A968F"
              fontFamily="var(--font-plex-mono), monospace"
              fontSize="12"
              letterSpacing="1"
            >
              FACE WIDTH — TO SPEC
            </text>
          </svg>
        </div>
      </div>
    </section>
  );
}
