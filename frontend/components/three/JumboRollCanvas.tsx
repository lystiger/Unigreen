"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Float, PresentationControls } from "@react-three/drei";
import * as THREE from "three";
import { JumboPaperRoll } from "./JumboPaperRoll";

/**
 * Isolated, reusable scene wrapper for the procedural jumbo tissue roll.
 *
 * Owns the render-quality and presentation decisions so the model component
 * stays agnostic:
 *  - DPR capped at 1.5 (perf requirement)
 *  - soft studio lighting built from lights only (no HDRI download)
 *  - soft contact shadow instead of a tuned shadow-map ground
 *  - mobile / prefers-reduced-motion -> reduced animation + lower poly + DPR 1
 *
 * Three variants:
 *  - "showcase" (default): opaque background, page scroll drives spin + unroll.
 *    Used by the /3d-test harness.
 *  - "hero": transparent background, model floats and is drag-to-rotate. Used
 *    as the landing hero centrepiece.
 *  - "journey": transparent background for dark journey section, scroll-driven
 *    spin and unroll feeding into the continuous web conveyor.
 */
const MOBILE_QUERY = "(max-width: 1024px)";

// Read synchronously so the Canvas mounts with the right camera/quality on the
// first frame. Safe because this component is loaded client-only (ssr: false).
const matches = (q: string) =>
  typeof window !== "undefined" && window.matchMedia(q).matches;

type Props = {
  className?: string;
  variant?: "showcase" | "hero" | "journey";
  fullBleed?: boolean;
};

export default function JumboRollCanvas({
  className,
  variant = "showcase",
  fullBleed = false,
}: Props) {
  const [reducedMotion, setReducedMotion] = useState(() =>
    matches("(prefers-reduced-motion: reduce)"),
  );
  const [isMobile, setIsMobile] = useState(() => matches(MOBILE_QUERY));

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia(MOBILE_QUERY);
    const sync = () => {
      setReducedMotion(motion.matches);
      setIsMobile(mobile.matches);
    };
    sync();
    motion.addEventListener("change", sync);
    mobile.addEventListener("change", sync);
    return () => {
      motion.removeEventListener("change", sync);
      mobile.removeEventListener("change", sync);
    };
  }, []);

  const isHero = variant === "hero";
  const isJourney = variant === "journey";
  const quality: "high" | "low" = isMobile ? "low" : "high";
  const shadows = !isMobile;

  // Camera distance: portrait viewports and the narrower hero column both need
  // the camera further back so the whole roll (incl. the end cap) frames cleanly.
  const camera: [number, number, number] = isMobile
    ? [0.2, 1.2, 15]
    : isHero
      ? [0.4, 1.1, 12]
      : isJourney
        ? [0.2, 1.3, 10.5]
        : [0.2, 1.5, 9.6];
  const fov = isMobile ? 38 : isHero ? 34 : 32;
  const heroOffset: [number, number, number] =
    fullBleed && !isMobile ? [3.15, 0, 0] : [0, 0, 0];

  // the roll itself; handles scroll unrolling, parallax, and idle dynamics
  const roll = (
    <JumboPaperRoll
      reducedMotion={reducedMotion}
      quality={quality}
      spin="scroll"
      parallax={!isMobile}
      baseUnroll={isHero ? 0.16 : 0}
    />
  );

  return (
    <Canvas
      key={`${isMobile ? "m" : "d"}-${variant}`}
      className={className}
      shadows={shadows}
      dpr={isMobile ? 1 : [1, 1.5]}
      gl={{
        antialias: true,
        alpha: isHero || isJourney,
        powerPreference: "high-performance",
      }}
      camera={{ position: camera, fov }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = isJourney ? 1.15 : 1.05;
      }}
    >
      {/* opaque studio backdrop for the showcase; transparent for hero/journey so
          they blend onto their parent section backgrounds */}
      {!isHero && !isJourney && <color attach="background" args={["#efe9df"]} />}

      {/* --- soft studio lighting ------------------------------------------ */}
      <ambientLight intensity={isJourney ? 0.55 : 0.45} />
      <hemisphereLight
        args={
          isJourney
            ? ["#fffaf2", "#0c1b14", 0.7]
            : ["#fffaf2", "#cbb89a", 0.6]
        }
      />
      {/* key light, slightly warm, casts the soft shadow */}
      <directionalLight
        position={[4, 7, 5]}
        intensity={isJourney ? 2.4 : 2.1}
        color="#fff4e2"
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={25}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0004}
      />
      {/* cool fill or brand-green rim light from the opposite side */}
      <directionalLight
        position={[-6, 2, -3]}
        intensity={isJourney ? 1.1 : 0.5}
        color={isJourney ? "#1e9445" : "#dfe7ff"}
      />

      {isHero ? (
        // drag-to-rotate with a spring return, plus a gentle idle float
        <PresentationControls
          enabled={!reducedMotion}
          global={false}
          cursor
          snap
          speed={1.2}
          polar={[-0.35, 0.35]}
          azimuth={[-0.7, 0.7]}
        >
          <Float
            enabled={!reducedMotion}
            speed={1.4}
            rotationIntensity={0.25}
            floatIntensity={0.7}
            floatingRange={[-0.12, 0.12]}
          >
            <group position={heroOffset}>{roll}</group>
          </Float>
        </PresentationControls>
      ) : (
        roll
      )}

      {/* soft grounded contact shadow */}
      <ContactShadows
        position={[
          isHero ? heroOffset[0] : 0,
          isHero ? -2.2 : isJourney ? -1.95 : -1.85,
          0,
        ]}
        opacity={isHero ? 0.35 : isJourney ? 0.65 : 0.5}
        scale={12}
        blur={2.6}
        far={5}
        resolution={isMobile ? 256 : 512}
        color={isJourney ? "#000000" : "#3b2f22"}
      />
    </Canvas>
  );
}
