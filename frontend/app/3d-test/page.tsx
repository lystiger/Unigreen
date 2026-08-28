"use client";

import dynamic from "next/dynamic";

// The Canvas touches window/WebGL, so keep it client-only (no SSR).
const JumboRollCanvas = dynamic(() => import("@/components/three/JumboRollCanvas"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center text-sm text-ink/50">
      Loading model…
    </div>
  ),
});

/**
 * Isolated judging harness. The canvas is pinned (sticky) full-viewport while a
 * tall scroll track drives the roll spin + sheet unroll. Overlay copy just
 * marks scroll progress; none of the real site layout is involved yet.
 */
export default function ThreeTestPage() {
  return (
    <main className="relative bg-[#efe9df] text-ink">
      {/* pinned stage */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <JumboRollCanvas className="!absolute inset-0 h-full w-full" />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center gap-2 p-8 text-center">
          <p className="text-xs font-medium tracking-[0.2em] text-ink/50">
            PROTOTYPE · PROCEDURAL R3F
          </p>
          <h1 className="text-2xl font-semibold text-ink/80 sm:text-3xl">
            Unigreen Jumbo Roll
          </h1>
          <p className="max-w-md text-sm text-ink/50">
            Scroll to rotate the roll and unwind the sheet. Move the pointer for
            parallax.
          </p>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
          <span className="animate-pulse text-xs tracking-widest text-ink/40">
            ↓ SCROLL ↓
          </span>
        </div>
      </div>

      {/* scroll track: gives the sticky stage room to animate through */}
      <div aria-hidden className="h-[320vh]" />

      <footer className="relative z-10 flex h-40 items-center justify-center bg-ink/5 text-sm text-ink/50">
        End of test track — model is fully unrolled.
      </footer>
    </main>
  );
}
