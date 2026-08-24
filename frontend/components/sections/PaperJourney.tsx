"use client";

import { useEffect, useRef } from "react";

interface Stage {
  readonly title: string;
  readonly en: string;
  readonly vi: string;
}

const STAGES: readonly Stage[] = [
  {
    title: "Unwinding",
    en: "The parent jumbo roll is mounted and unwound at controlled tension.",
    vi: "Cuộn giấy jumbo được lắp và tở ra ở lực căng ổn định.",
  },
  {
    title: "Converting",
    en: "The web is embossed and laminated to the required ply, and printed where the specification calls for it.",
    vi: "Giấy được dập nổi, ghép đủ số lớp và in theo yêu cầu.",
  },
  {
    title: "Cutting / folding / rewinding",
    en: "The web is cut to width, then folded or rewound into the finished format.",
    vi: "Giấy được cắt theo khổ, gấp hoặc cuộn lại thành quy cách thành phẩm.",
  },
  {
    title: "Finishing",
    en: "Cores are set or removed, rolls are wrapped, cartons are packed and labelled.",
    vi: "Lắp hoặc bỏ lõi, đóng gói cuộn, vô thùng và dán nhãn.",
  },
  {
    title: "Your product",
    en: "The finished product leaves the line in your specification, and under your brand if required.",
    vi: "Thành phẩm rời chuyền theo đúng quy cách và thương hiệu của bạn.",
  },
];

const STATION_LABEL = "font-mono text-[12px]";

/**
 * Scroll-driven "paper journey" section, ported from `Uni-Green Landing.dc.html`.
 * A compact scroll section pins a viewport-height stage while scroll progress
 * advances the five converting stages, travels the paper texture, fills the
 * rail, and cross-fades the station diagrams. Per-frame values are written
 * imperatively via refs (as in the source) so the fades stay continuous.
 */
export function PaperJourney() {
  const sectionRef = useRef<HTMLElement>(null);
  const travelRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const stageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bodyRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const stationRefs = useRef<(SVGSVGElement | null)[]>([]);
  const spinRefs = useRef<(SVGGElement | null)[]>([]);

  useEffect(() => {
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame: number | null = null;

    const update = () => {
      frame = null;
      const journey = sectionRef.current;
      if (!journey) return;
      const isMobile = window.innerWidth < 1024;

      if (isMobile) {
        stageRefs.current.forEach((el, i) => {
          if (!el) return;
          el.style.opacity = "1";
          const body = bodyRefs.current[i];
          if (body) {
            body.style.opacity = "1";
            body.style.maxHeight = "160px";
            body.style.marginTop = "8px";
          }
        });
        return;
      }

      const rect = journey.getBoundingClientRect();
      const span = Math.max(1, journey.offsetHeight - window.innerHeight);
      const p = clamp(-rect.top / span, 0, 1);
      const t = p * 5;
      const activeIndex = Math.min(4, Math.floor(t));

      if (travelRef.current)
        travelRef.current.style.transform = `translateY(${p * 44 * 18}px)`;
      if (railRef.current) railRef.current.style.transform = `scaleY(${p})`;

      stationRefs.current.forEach((el, i) => {
        if (!el) return;
        const d = t - i;
        const o = clamp(1 - Math.abs(d - 0.5) / 0.85, 0, 1);
        el.style.opacity = String(o);
        el.style.transform = `translateY(${(d - 0.5) * -34}px)`;
      });

      stageRefs.current.forEach((el, i) => {
        if (!el) return;
        const active = activeIndex === i;
        el.style.opacity = active ? "1" : "0.42";
        const body = bodyRefs.current[i];
        if (body) {
          body.style.opacity = active ? "1" : "0";
          body.style.maxHeight = active ? "140px" : "0px";
          body.style.marginTop = active ? "8px" : "0px";
        }
      });

      if (!reduced) {
        const deg = p * 900;
        spinRefs.current.forEach((g) => {
          if (g) g.style.transform = `rotate(${deg}deg)`;
        });
      }
    };

    const onScroll = () => {
      if (frame == null) frame = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame != null) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section
      id="paper-journey"
      ref={sectionRef}
      aria-label="The paper journey"
      className="relative bg-ink text-paper lg:h-[320vh]"
    >
      <div className="py-24 lg:sticky lg:top-0 lg:h-screen lg:overflow-hidden lg:py-0">
        <div className="shell grid h-full grid-cols-1 items-center gap-16 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
          {/* Stage list */}
          <div className="relative z-[2]">
            <p className="mb-7 font-mono text-[11px] uppercase tracking-[0.16em] text-brand-green">
              02 / The paper journey
            </p>
            <div className="flex flex-col gap-7 lg:gap-3.5">
              {STAGES.map((stage, i) => (
                <div
                  key={stage.title}
                  ref={(el) => {
                    stageRefs.current[i] = el;
                  }}
                  className="grid grid-cols-[44px_minmax(0,1fr)] gap-4 opacity-100 transition-opacity duration-[380ms] ease-in-out lg:grid-cols-[56px_minmax(0,1fr)] lg:gap-5 lg:opacity-[0.42]"
                >
                  <span className="pt-[5px] font-mono text-[12px] tracking-[0.1em] text-brand-green">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-[clamp(22px,2.4vw,32px)] font-medium leading-[1.1] tracking-[-0.02em]">
                      {stage.title}
                    </p>
                    <p
                      ref={(el) => {
                        bodyRefs.current[i] = el;
                      }}
                      className="max-w-[46ch] overflow-hidden text-[15px] leading-[1.55] text-[#8FA096]"
                      style={{
                        marginTop: "8px",
                        transition:
                          "opacity 320ms ease, max-height 380ms ease, margin-top 380ms ease",
                      }}
                    >
                      {stage.en}
                      <br />
                      <span className="text-ink-muted">{stage.vi}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 grid grid-cols-5 gap-1 lg:hidden" aria-hidden="true">
              {STAGES.map((stage, i) => (
                <div key={stage.title} className="relative pt-4">
                  <span className="absolute left-0 right-0 top-0 h-px bg-brand-green/60" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-brand-green">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Journey visual */}
          <div className="relative hidden h-full items-center justify-center lg:flex">
            <div className="relative h-[76vh] w-full max-w-[660px]">
              <div className="absolute inset-x-8 top-5 flex items-center justify-between border-b border-white/15 pb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
                <span>Parent roll input</span>
                <span className="text-brand-green">Continuous web</span>
                <span>Finished output</span>
              </div>

              <div className="absolute inset-x-8 bottom-5 flex justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-white/35">
                <span>Width controlled</span>
                <span>Ply / emboss / cut</span>
                <span>QC released</span>
              </div>

              <div className="absolute inset-y-[12%] left-8 w-px bg-white/10" />
              <div className="absolute inset-y-[12%] right-8 w-px bg-white/10" />

              {/* Travelling paper web */}
              <div className="absolute inset-y-[9%] left-1/2 w-[224px] -translate-x-1/2 overflow-hidden border-x border-white/20 bg-paper shadow-[0_0_80px_rgba(0,0,0,0.42)]">
                <div
                  ref={travelRef}
                  className="absolute inset-x-0 top-[-200%] h-[400%]"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(180deg, rgba(12,27,20,0.055) 0 1px, transparent 1px 44px)",
                  }}
                />
                <div className="absolute inset-y-0 left-0 w-[14px] bg-gradient-to-r from-[rgba(12,27,20,0.10)] to-transparent" />
                <div className="absolute inset-y-0 right-0 w-[14px] bg-gradient-to-l from-[rgba(12,27,20,0.10)] to-transparent" />
              </div>

              {/* Station 0 — unwinding */}
              <svg
                ref={(el) => {
                  stationRefs.current[0] = el;
                }}
                viewBox="0 0 520 520"
                className="absolute inset-0 h-full w-full opacity-0"
                aria-hidden="true"
              >
                <g stroke="#1E9445" strokeWidth="1.5" fill="none">
                  <circle cx="260" cy="150" r="104" stroke="rgba(251,250,247,0.5)" />
                  <circle cx="260" cy="150" r="78" stroke="rgba(251,250,247,0.28)" />
                  <circle cx="260" cy="150" r="52" stroke="rgba(251,250,247,0.28)" />
                  <circle cx="260" cy="150" r="26" stroke="rgba(251,250,247,0.28)" />
                  <g
                    ref={(el) => {
                      spinRefs.current[0] = el;
                    }}
                    style={{ transformOrigin: "260px 150px" }}
                  >
                    <line x1="260" y1="150" x2="260" y2="46" />
                  </g>
                  <path
                    d="M156 150 C 156 90, 200 60, 260 60"
                    stroke="rgba(251,250,247,0.7)"
                    strokeWidth="2"
                  />
                </g>
                <text
                  x="260"
                  y="330"
                  textAnchor="middle"
                  fill="#1E9445"
                  className={STATION_LABEL}
                  letterSpacing="2"
                >
                  TENSION CONTROLLED
                </text>
              </svg>

              {/* Station 1 — converting */}
              <svg
                ref={(el) => {
                  stationRefs.current[1] = el;
                }}
                viewBox="0 0 520 520"
                className="absolute inset-0 h-full w-full opacity-0"
                aria-hidden="true"
              >
                <g fill="none" stroke="#1E9445" strokeWidth="1.5">
                  <circle cx="128" cy="230" r="58" />
                  <circle cx="128" cy="230" r="8" />
                  <circle cx="392" cy="230" r="58" />
                  <circle cx="392" cy="230" r="8" />
                  <circle cx="128" cy="330" r="34" stroke="rgba(251,250,247,0.4)" />
                  <circle cx="392" cy="330" r="34" stroke="rgba(251,250,247,0.4)" />
                </g>
                <g fill="rgba(12,27,20,0.16)">
                  <circle cx="228" cy="200" r="3" />
                  <circle cx="260" cy="216" r="3" />
                  <circle cx="292" cy="200" r="3" />
                  <circle cx="228" cy="248" r="3" />
                  <circle cx="260" cy="264" r="3" />
                  <circle cx="292" cy="248" r="3" />
                  <circle cx="228" cy="296" r="3" />
                  <circle cx="260" cy="312" r="3" />
                  <circle cx="292" cy="296" r="3" />
                </g>
                <text
                  x="260"
                  y="430"
                  textAnchor="middle"
                  fill="#1E9445"
                  className={STATION_LABEL}
                  letterSpacing="2"
                >
                  EMBOSS · PLY · PRINT
                </text>
              </svg>

              {/* Station 2 — cutting */}
              <svg
                ref={(el) => {
                  stationRefs.current[2] = el;
                }}
                viewBox="0 0 520 520"
                className="absolute inset-0 h-full w-full opacity-0"
                aria-hidden="true"
              >
                <g stroke="#0C1B14" strokeWidth="1.5" fill="none" opacity="0.35">
                  <line x1="212" y1="0" x2="212" y2="520" strokeDasharray="6 8" />
                  <line x1="308" y1="0" x2="308" y2="520" strokeDasharray="6 8" />
                </g>
                <g stroke="#1E9445" strokeWidth="1.5" fill="none">
                  <line x1="60" y1="250" x2="200" y2="250" />
                  <path d="M200 236 L 226 250 L 200 264 Z" fill="#1E9445" />
                  <line x1="460" y1="250" x2="320" y2="250" />
                  <path d="M320 236 L 294 250 L 320 264 Z" fill="#1E9445" />
                  <line
                    x1="176"
                    y1="330"
                    x2="344"
                    y2="330"
                    strokeDasharray="4 6"
                    stroke="rgba(12,27,20,0.35)"
                  />
                  <line
                    x1="176"
                    y1="376"
                    x2="344"
                    y2="376"
                    strokeDasharray="4 6"
                    stroke="rgba(12,27,20,0.35)"
                  />
                </g>
                <text
                  x="260"
                  y="466"
                  textAnchor="middle"
                  fill="#1E9445"
                  className={STATION_LABEL}
                  letterSpacing="2"
                >
                  CUT TO WIDTH · PERFORATE
                </text>
              </svg>

              {/* Station 3 — finishing */}
              <svg
                ref={(el) => {
                  stationRefs.current[3] = el;
                }}
                viewBox="0 0 520 520"
                className="absolute inset-0 h-full w-full opacity-0"
                aria-hidden="true"
              >
                <g stroke="#1E9445" strokeWidth="1.5" fill="none">
                  <rect
                    x="176"
                    y="196"
                    width="168"
                    height="128"
                    stroke="rgba(251,250,247,0.75)"
                  />
                  <line
                    x1="176"
                    y1="240"
                    x2="344"
                    y2="240"
                    stroke="rgba(251,250,247,0.35)"
                  />
                  <line
                    x1="260"
                    y1="196"
                    x2="260"
                    y2="324"
                    stroke="rgba(251,250,247,0.35)"
                  />
                  <path d="M120 168 L 120 140 L 148 140" />
                  <path d="M400 168 L 400 140 L 372 140" />
                  <path d="M120 352 L 120 380 L 148 380" />
                  <path d="M400 352 L 400 380 L 372 380" />
                </g>
                <text
                  x="260"
                  y="426"
                  textAnchor="middle"
                  fill="#1E9445"
                  className={STATION_LABEL}
                  letterSpacing="2"
                >
                  WRAP · CARTON · LABEL
                </text>
              </svg>

              {/* Station 4 — your product */}
              <svg
                ref={(el) => {
                  stationRefs.current[4] = el;
                }}
                viewBox="0 0 520 520"
                className="absolute inset-0 h-full w-full opacity-0"
                aria-hidden="true"
              >
                <g stroke="#0C1B14" strokeWidth="1.5" fill="#FBFAF7">
                  <rect x="196" y="214" width="128" height="120" rx="2" />
                  <ellipse cx="260" cy="214" rx="64" ry="20" />
                  <ellipse cx="260" cy="214" rx="18" ry="6" fill="#F4F2EC" />
                </g>
                <rect x="196" y="262" width="128" height="26" fill="#1E9445" />
                <text
                  x="260"
                  y="280"
                  textAnchor="middle"
                  fill="#FBFAF7"
                  className="font-mono text-[11px]"
                  letterSpacing="2"
                >
                  YOUR BRAND
                </text>
                <text
                  x="260"
                  y="392"
                  textAnchor="middle"
                  fill="#1E9445"
                  className={STATION_LABEL}
                  letterSpacing="2"
                >
                  TO YOUR SPECIFICATION
                </text>
              </svg>

              {/* Progress rail */}
              <div className="absolute inset-y-[18%] right-2 w-px bg-white/[0.14]">
                <div
                  ref={railRef}
                  className="absolute left-0 top-0 h-full w-px origin-top bg-brand-green"
                  style={{ transform: "scaleY(0)" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
