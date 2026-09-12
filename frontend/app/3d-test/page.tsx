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
 * Isolated judging harness. Full-screen clean view of the 3D jumbo roll.
 */
export default function ThreeTestPage() {
  return (
    <main className="relative bg-[#FAF7F2] text-ink">
      {/* pinned stage */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <JumboRollCanvas className="!absolute inset-0 h-full w-full" />
      </div>

      {/* scroll track: gives the sticky stage room to animate through */}
      <div aria-hidden className="h-[320vh]" />
    </main>
  );
}
