"use client";

import dynamic from "next/dynamic";

// Client-only: the Canvas touches window/WebGL, so never SSR it.
const JumboRollCanvas = dynamic(() => import("./JumboRollCanvas"), { ssr: false });

/**
 * Hero centrepiece: clean, interactive 3D procedural jumbo roll.
 * Renders cleanly with zero text overlays or badge distractions.
 */
export function HeroRoll({ fullBleed = false }: { fullBleed?: boolean }) {
  return (
    <div className="relative h-full min-h-[520px] w-full pointer-events-auto">
      <JumboRollCanvas
        variant="hero"
        fullBleed={fullBleed}
        className="!absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing touch-none"
      />
    </div>
  );
}
