"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Float } from "@react-three/drei";
import * as THREE from "three";
import { JumboPaperRoll } from "./JumboPaperRoll";

/**
 * High-fidelity 3D scene wrapper for the procedural jumbo tissue roll.
 *
 * Renders an authentic studio environment inspired by docs/image.png:
 *  - High quality soft 3-point studio lighting + rim definition
 *  - Floor contact shadows with realistic penumbra
 *  - Seamless pointer drag-to-rotate inertia, hover parallax, and scroll unrolling
 *  - Adaptive DPR and performance scaling for mobile
 */
const MOBILE_QUERY = "(max-width: 1024px)";

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

  // Camera framing tailored for hero split layout vs full showcase
  const camera: [number, number, number] = isMobile
    ? [0.2, 0.6, 11.5]
    : isHero
      ? [0.2, 0.4, 9.4]
      : isJourney
        ? [0.2, 0.8, 8.8]
        : [0.2, 0.5, 8.2];
  const fov = isMobile ? 36 : isHero ? 32 : 30;
  const heroOffset: [number, number, number] =
    fullBleed && !isMobile ? [2.35, -0.15, 0] : [0, -0.1, 0];

  const roll = (
    <JumboPaperRoll
      reducedMotion={reducedMotion}
      quality={quality}
      spin={isHero ? "auto" : "scroll"}
      parallax={!isMobile}
      baseUnroll={isHero ? 0.42 : 0.35}
      interactive={true}
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
      {/* Studio backdrop for standalone showcase */}
      {!isHero && !isJourney && <color attach="background" args={["#FAF7F2"]} />}

      {/* --- Soft Studio Lighting ----------------------------------------- */}
      <ambientLight intensity={isJourney ? 0.6 : 0.75} />
      <hemisphereLight
        args={isJourney ? ["#fffaf2", "#0c1b14", 0.7] : ["#FFFFFF", "#ECE5D8", 0.75]}
      />

      {/* Key light: warm studio light creating gentle paper curvature highlights */}
      <directionalLight
        position={[6, 9, 7]}
        intensity={isJourney ? 2.6 : 2.0}
        color={isJourney ? "#fff4e2" : "#FFF9F2"}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={25}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-bias={-0.0003}
      />

      {/* Fill light: soft diffuse to illuminate inner core and side cap */}
      <directionalLight
        position={[-6, 3, -2]}
        intensity={isJourney ? 1.0 : 0.7}
        color="#EDF4FF"
      />

      {/* Top-Back Rim Light: delicate silhouette separation */}
      <directionalLight position={[0, 7, -6]} intensity={0.55} color="#FFFFFF" />

      {isHero ? (
        <Float
          enabled={!reducedMotion}
          speed={1.2}
          rotationIntensity={0.12}
          floatIntensity={0.35}
          floatingRange={[-0.08, 0.08]}
        >
          <group position={heroOffset}>{roll}</group>
        </Float>
      ) : (
        <group position={heroOffset}>{roll}</group>
      )}

      {/* Soft grounded floor contact shadow under roll and draped sheet */}
      <ContactShadows
        position={[isHero ? heroOffset[0] : 0, -2.0, 0.3]}
        opacity={isHero ? 0.32 : isJourney ? 0.65 : 0.45}
        scale={9.5}
        blur={2.8}
        far={4.5}
        resolution={isMobile ? 256 : 512}
        color={isJourney ? "#000000" : "#2E2419"}
      />
    </Canvas>
  );
}
