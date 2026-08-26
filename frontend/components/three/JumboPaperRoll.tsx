"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Procedural industrial jumbo tissue roll.
 *
 * Everything here is built from Three.js primitives and small canvas-generated
 * textures — no GLB, no external assets, no downloaded HDRIs. The whole model
 * is deliberately low-poly (a couple of cylinders, two annulus caps, one draped
 * sheet) so it stays cheap enough for a hero background on mobile.
 *
 * Driven inputs:
 *  - page scroll  -> roll spins on its axis + the sheet "unrolls" downward
 *  - pointer      -> very subtle parallax tilt of the whole model
 */

// --- model dimensions (world units) -----------------------------------------
const ROLL_RADIUS = 1.6;
const ROLL_LENGTH = 4.2;
const CORE_RADIUS = 0.44;
const SHEET_MAX_LEN = 4.6;
const SHEET_WIDTH = ROLL_LENGTH * 0.92;

// how many full turns the roll makes across the whole scroll range
const SCROLL_TURNS = 2.25;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Warm-white fibrous paper roughness/bump noise. Small (256px) and procedural,
 * repeated across the surface — clean and soft.
 */
function makePaperNoise(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    // gentle fine grain centered around luminous warm white
    const v = 190 + Math.floor(Math.random() * 65);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 3);
  tex.anisotropy = 8;
  return tex;
}

/**
 * Concentric wound-layer rings for the roll end caps.
 * Combines fine paper winding rings with a subtle brand-green radius spec indicator.
 */
function makeRingTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const cx = size / 2;

  // Luminous warm virgin paper base
  ctx.fillStyle = "#FAF8F3";
  ctx.fillRect(0, 0, size, size);

  // Concentric wound paper rings
  const rings = 140;
  for (let i = rings; i > 0; i--) {
    const r = (i / rings) * cx * 0.98;
    const alpha = 0.15 + (Math.sin(i * 1.5) + 1) * 0.12;
    ctx.beginPath();
    ctx.arc(cx, cx, r, 0, Math.PI * 2);
    ctx.lineWidth = i % 8 === 0 ? 1.4 : 0.8;
    ctx.strokeStyle = `rgba(180, 172, 155, ${alpha})`;
    ctx.stroke();
  }

  // Green technical radius measurement line (from original blueprint design)
  const coreEdge = cx * 0.28;
  const outerEdge = cx * 0.97;
  ctx.beginPath();
  ctx.moveTo(cx, cx - coreEdge);
  ctx.lineTo(cx, cx - outerEdge);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#1E9445";
  ctx.stroke();

  // Subtle radius tick at the tip
  ctx.beginPath();
  ctx.moveTo(cx - 4, cx - outerEdge);
  ctx.lineTo(cx + 4, cx - outerEdge);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#1E9445";
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  return tex;
}

/**
 * Kraft cardboard texture for the inner winding core.
 */
function makeCoreTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = "#C29B6C"; // kraft base
  ctx.fillRect(0, 0, size, size);

  // spiral seams
  ctx.strokeStyle = "#A47E50";
  ctx.lineWidth = 3;
  for (let y = -size; y < size * 2; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y + size * 0.5);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  return tex;
}

/**
 * Builds the peeling sheet as a single draped strip. Rows run from the
 * attachment edge (top) downward, so revealing the geometry via drawRange
 * "unrolls" it from the roll rather than stretching it.
 *
 * A gentle peel curve is baked in: the strip leaves the roll tilted forward,
 * then straightens into a vertical fall.
 */
function makeSheetGeometry(wSeg: number, hSeg: number) {
  const geo = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // integrate a heading that starts tilted forward and decays to straight down
  const rows: Array<{ y: number; z: number }> = [];
  let y = 0;
  let z = 0;
  const ds = SHEET_MAX_LEN / hSeg;
  const theta0 = 0.7; // initial forward tilt (radians from vertical)
  const decay = SHEET_MAX_LEN * 0.35;
  for (let r = 0; r <= hSeg; r++) {
    rows.push({ y, z });
    const s = r * ds;
    const theta = theta0 * Math.exp(-s / decay);
    y -= Math.cos(theta) * ds;
    z += Math.sin(theta) * ds;
  }

  for (let r = 0; r <= hSeg; r++) {
    const row = rows[r]!;
    // subtle lengthwise sag so the paper reads as soft, not a rigid board
    for (let cCol = 0; cCol <= wSeg; cCol++) {
      const u = cCol / wSeg;
      const x = (u - 0.5) * SHEET_WIDTH;
      const sag = Math.cos((u - 0.5) * Math.PI) * 0.06 * (r / hSeg);
      positions.push(x, row.y - sag, row.z);
      uvs.push(u, 1 - r / hSeg);
    }
  }

  const stride = wSeg + 1;
  for (let r = 0; r < hSeg; r++) {
    for (let cCol = 0; cCol < wSeg; cCol++) {
      const a = r * stride + cCol;
      const b = a + 1;
      const d = a + stride;
      const e = d + 1;
      indices.push(a, d, b, b, d, e);
    }
  }

  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return { geo, totalIndices: indices.length, hSeg, wSeg };
}

type Props = {
  reducedMotion: boolean;
  quality: "high" | "low";
  /** "scroll": page scroll drives spin + unroll. "auto": gentle idle spin for a
   *  floating hero (rotation is meant to be owned by drag controls outside). */
  spin?: "scroll" | "auto";
  /** apply the built-in pointer parallax. Turn off when an outer control (e.g.
   *  drei PresentationControls) already owns the model's rotation. */
  parallax?: boolean;
  /** fixed amount of sheet left hanging in "auto" mode (0..1). */
  baseUnroll?: number;
};

export function JumboPaperRoll({
  reducedMotion,
  quality,
  spin = "scroll",
  parallax = true,
  baseUnroll = 0,
}: Props) {
  const modelRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const sheetRef = useRef<THREE.Mesh>(null);

  // live scroll progress 0..1, updated outside React's render loop
  const scrollProgress = useRef(reducedMotion ? 0.5 : 0);
  const spinAngle = useRef(0);
  const sheetShown = useRef(reducedMotion ? 0.5 : 0);

  const radialSeg = quality === "high" ? 96 : 40;
  const sheetWSeg = quality === "high" ? 24 : 10;
  const sheetHSeg = quality === "high" ? 48 : 22;

  // --- geometries & textures (built once) -----------------------------------
  const paperNoise = useMemo(() => makePaperNoise(), []);
  const ringTexture = useMemo(() => makeRingTexture(), []);
  const coreTexture = useMemo(() => makeCoreTexture(), []);

  const paperGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(
      ROLL_RADIUS,
      ROLL_RADIUS,
      ROLL_LENGTH,
      radialSeg,
      1,
      true,
    );
    g.rotateZ(Math.PI / 2); // lay the roll along X
    return g;
  }, [radialSeg]);

  const capGeo = useMemo(
    () => new THREE.RingGeometry(CORE_RADIUS * 1.02, ROLL_RADIUS, radialSeg),
    [radialSeg],
  );

  const coreGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(
      CORE_RADIUS,
      CORE_RADIUS,
      ROLL_LENGTH * 1.04,
      radialSeg,
      1,
    );
    g.rotateZ(Math.PI / 2);
    return g;
  }, [radialSeg]);

  const sheet = useMemo(
    () => makeSheetGeometry(sheetWSeg, sheetHSeg),
    [sheetWSeg, sheetHSeg],
  );

  // dispose GPU resources on unmount
  useEffect(() => {
    return () => {
      [paperNoise, ringTexture, coreTexture].forEach((t) => t.dispose());
      [paperGeo, capGeo, coreGeo, sheet.geo].forEach((g) => g.dispose());
    };
  }, [paperNoise, ringTexture, coreTexture, paperGeo, capGeo, coreGeo, sheet.geo]);

  // --- scroll tracking ------------------------------------------------------
  useEffect(() => {
    if (reducedMotion || spin !== "scroll") return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress.current =
        max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reducedMotion, spin]);

  // --- per-frame animation --------------------------------------------------
  useFrame((state, delta) => {
    // --- roll spin + sheet target depend on the drive mode ------------------
    let sheetTarget: number;
    if (spin === "auto") {
      // continuous slow idle rotation for the floating hero
      if (!reducedMotion) spinAngle.current += delta * 0.22;
      sheetTarget = baseUnroll;
    } else {
      const p = scrollProgress.current;
      const idle = reducedMotion ? 0 : state.clock.elapsedTime * 0.04;
      const targetSpin = p * SCROLL_TURNS * Math.PI * 2 + idle;
      spinAngle.current = lerp(spinAngle.current, targetSpin, reducedMotion ? 1 : 0.12);
      sheetTarget = baseUnroll > 0 ? baseUnroll + p * (1 - baseUnroll) : p;
    }
    if (spinRef.current) spinRef.current.rotation.x = spinAngle.current;

    // sheet unrolls downward (drawRange reveal, top-first — no stretching)
    sheetShown.current = lerp(sheetShown.current, sheetTarget, reducedMotion ? 1 : 0.1);
    if (sheetRef.current) {
      const rowsVisible = Math.round(sheetShown.current * sheet.hSeg);
      const count = rowsVisible * sheet.wSeg * 6;
      sheetRef.current.geometry.setDrawRange(0, count);
      sheetRef.current.visible = count > 0;
    }

    // subtle pointer parallax on the whole model (skip when an outer control
    // owns rotation, e.g. drag controls on the hero)
    if (parallax && modelRef.current) {
      const px = reducedMotion ? 0 : state.pointer.x;
      const py = reducedMotion ? 0 : state.pointer.y;
      const damp = 1 - Math.pow(0.001, delta); // frame-rate independent easing
      modelRef.current.rotation.y = lerp(modelRef.current.rotation.y, px * 0.16, damp);
      modelRef.current.rotation.x = lerp(
        modelRef.current.rotation.x,
        -0.08 + py * 0.08,
        damp,
      );
    }
  });

  return (
    <group ref={modelRef}>
      {/* static 3/4 pose so the wound-ring caps and brown core stay visible;
          the roll axis stays fixed while spinRef turns the body around it */}
      <group rotation={[-0.14, -0.58, 0.05]}>
        <group ref={spinRef}>
          {/* luminous warm white virgin tissue roll body */}
          <mesh geometry={paperGeo} castShadow receiveShadow>
            <meshStandardMaterial
              color="#FAF8F3"
              roughness={0.88}
              metalness={0}
              roughnessMap={paperNoise}
              bumpMap={paperNoise}
              bumpScale={0.003}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* wound-layer end caps (annulus) with spec radius indicator */}
          {([1, -1] as const).map((dir) => (
            <mesh
              key={dir}
              geometry={capGeo}
              position={[dir * (ROLL_LENGTH / 2 - 0.001), 0, 0]}
              rotation={[0, (dir * Math.PI) / 2, 0]}
              castShadow
            >
              <meshStandardMaterial
                map={ringTexture}
                roughness={0.92}
                metalness={0}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}

          {/* kraft cardboard core tube */}
          <mesh geometry={coreGeo} castShadow receiveShadow>
            <meshStandardMaterial
              color="#C69E70"
              map={coreTexture}
              roughness={0.85}
              metalness={0}
            />
          </mesh>
        </group>

        {/* peeling sheet, hung from the lower-front of the roll (does not spin) */}
        <mesh
          ref={sheetRef}
          geometry={sheet.geo}
          position={[0, -ROLL_RADIUS * 0.28, ROLL_RADIUS * 0.96]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color="#FCFAF5"
            roughness={0.9}
            metalness={0}
            roughnessMap={paperNoise}
            bumpMap={paperNoise}
            bumpScale={0.0025}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}
