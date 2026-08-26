"use client";

import dynamic from "next/dynamic";

// Client-only: the Canvas touches window/WebGL, so never SSR it.
const JumboRollCanvas = dynamic(() => import("./JumboRollCanvas"), { ssr: false });

/**
 * Hero centrepiece: interactive, floating 3D procedural jumbo roll.
 * Renders directly on all clients with drag-to-rotate, scroll unwinding, and mouse parallax.
 */
export function HeroRoll({ fullBleed = false }: { fullBleed?: boolean }) {
  return (
    <div className="relative h-full min-h-[520px] w-full">
      <JumboRollCanvas
        variant="hero"
        fullBleed={fullBleed}
        className="!absolute inset-0 h-full w-full"
      />

      {/* Technical dimension annotation framing the 3D roll */}
      <div className="pointer-events-none absolute right-[14%] top-16 hidden lg:flex flex-col items-center gap-1 font-mono text-[11px] tracking-[0.18em] text-ink-muted/80 select-none">
        <div className="flex items-center gap-3 w-64">
          <div className="h-2 w-px bg-line-strong" />
          <div className="h-px flex-1 border-t border-dashed border-line-strong" />
          <span>FACE WIDTH — TO SPEC</span>
          <div className="h-px flex-1 border-t border-dashed border-line-strong" />
          <div className="h-2 w-px bg-line-strong" />
        </div>
      </div>

      {/* Interactive guide badge */}
      <div
        className={`pointer-events-none absolute bottom-8 flex items-center gap-2 rounded-full border border-line bg-paper/90 px-3.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-sm select-none font-mono text-[11px] tracking-[0.14em] text-ink-faint ${
          fullBleed
            ? "left-1/2 -translate-x-1/2 lg:left-auto lg:right-[16%] lg:translate-x-0"
            : "left-1/2 -translate-x-1/2"
        }`}
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-green animate-pulse" />
        <span>Drag to rotate · Scroll to unroll</span>
      </div>
    </div>
  );
}
