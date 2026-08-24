"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Client-only: the Canvas touches window/WebGL, so never SSR it.
const JumboRollCanvas = dynamic(() => import("./JumboRollCanvas"), { ssr: false });

/**
 * Hero centrepiece: interactive, floating 3D procedural jumbo roll.
 * Renders directly on all clients with drag-to-rotate, scroll unwinding, and mouse parallax.
 */
export function HeroRoll({
  fullBleed = false,
}: {
  fullBleed?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative h-full min-h-[520px] w-full">
      {mounted && (
        <JumboRollCanvas
          variant="hero"
          fullBleed={fullBleed}
          className="!absolute inset-0 h-full w-full"
        />
      )}
      <span
        className={`pointer-events-none absolute bottom-3 select-none font-mono text-[11px] tracking-[0.16em] text-ink-faint/70 ${fullBleed ? "left-1/2 -translate-x-1/2 lg:left-3/4" : "left-1/2 -translate-x-1/2"}`}
      >
        Drag to rotate
      </span>
    </div>
  );
}
