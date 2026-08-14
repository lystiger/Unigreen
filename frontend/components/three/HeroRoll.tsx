"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";

// Client-only: the Canvas touches window/WebGL, so never SSR it.
const JumboRollCanvas = dynamic(() => import("./JumboRollCanvas"), { ssr: false });

/** Cheap WebGL capability probe. */
function webglSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return (
      !!window.WebGLRenderingContext &&
      !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

/**
 * Hero centrepiece: an interactive, floating 3D jumbo roll.
 *
 * Progressive enhancement — the static SVG (`children`) renders on the server
 * and stays put on reduced-motion, coarse-pointer/small screens, or when WebGL
 * is unavailable. Only capable desktop clients swap in the live canvas, so the
 * hero never ships a blank box or a heavy interaction to phones.
 */
export function HeroRoll({ children }: { children: ReactNode }) {
  const [use3D, setUse3D] = useState(false);

  useEffect(() => {
    const decide = () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const coarseOrSmall = window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
      setUse3D(!reduce && !coarseOrSmall && webglSupported());
    };
    decide();
    window.addEventListener("resize", decide);
    return () => window.removeEventListener("resize", decide);
  }, []);

  if (!use3D) {
    return <div className="flex w-full items-center justify-center">{children}</div>;
  }

  return (
    <div className="relative h-full min-h-[520px] w-full">
      <JumboRollCanvas variant="hero" className="!absolute inset-0 h-full w-full" />
      <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 select-none font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint/70">
        Drag to rotate
      </span>
    </div>
  );
}
