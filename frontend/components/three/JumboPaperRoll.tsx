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
 * repeated across the surface — cheap, no texture download.
 */
function makePaperNoise(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    // low-contrast grain centred around mid grey
    const v = 150 + Math.floor(Math.random() * 105);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 4);
  tex.anisotropy = 8;
  return tex;
}

/**
 * Concentric wound-layer rings for the roll end caps. The RingGeometry uses a
 * planar UV, so a concentric-circle canvas maps as true concentric rings on the
 * annular face.
 */
function makeRingTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const cx = size / 2;

  ctx.fillStyle = "#f2ece0"; // warm white base
  ctx.fillRect(0, 0, size, size);

  // faint, tightly-spaced concentric rings suggesting wound paper layers
  const rings = 120;
  for (let i = rings; i > 0; i--) {
    const r = (i / rings) * cx * 0.96;
    const shade = 210 + Math.floor(Math.sin(i * 1.7) * 12 + (Math.random() - 0.5) * 8);
    ctx.beginPath();
    ctx.arc(cx, cx, r, 0, Math.PI * 2);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = `rgba(${shade - 40}, ${shade - 55}, ${shade - 80}, 0.35)`;
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
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

  const paperGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(ROLL_RADIUS, ROLL_RADIUS, ROLL_LENGTH, radialSeg, 1, true);
    g.rotateZ(Math.PI / 2); // lay the roll along X
    return g;
  }, [radialSeg]);

  const capGeo = useMemo(
    () => new THREE.RingGeometry(CORE_RADIUS * 1.02, ROLL_RADIUS, radialSeg),
    [radialSeg],
  );

  const coreGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(CORE_RADIUS, CORE_RADIUS, ROLL_LENGTH * 1.04, radialSeg, 1);
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
      [paperNoise, ringTexture].forEach((t) => t.dispose());
      [paperGeo, capGeo, coreGeo, sheet.geo].forEach((g) => g.dispose());
    };
  }, [paperNoise, ringTexture, paperGeo, capGeo, coreGeo, sheet.geo]);

  // --- scroll tracking ------------------------------------------------------
  useEffect(() => {
    if (reducedMotion || spin !== "scroll") return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress.current = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
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
      sheetTarget = p;
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
      modelRef.current.rotation.x = lerp(modelRef.current.rotation.x, -0.08 + py * 0.08, damp);
    }
  });

  return (
    <group ref={modelRef}>
      {/* static 3/4 pose so the wound-ring caps and brown core stay visible;
          the roll axis stays fixed while spinRef turns the body around it */}
      <group rotation={[-0.14, -0.58, 0.05]}>
      <group ref={spinRef}>
        {/* white paper roll body */}
        <mesh geometry={paperGeo} castShadow receiveShadow>
          <meshStandardMaterial
            color="#f5efe4"
            roughness={0.92}
            metalness={0}
            roughnessMap={paperNoise}
            bumpMap={paperNoise}
            bumpScale={0.006}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* wound-layer end caps (annulus) */}
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
              roughness={0.95}
              metalness={0}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}

        {/* brown cardboard core, poking out both ends */}
        <mesh geometry={coreGeo} castShadow receiveShadow>
          <meshStandardMaterial color="#9c6b3f" roughness={0.85} metalness={0} />
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
          color="#f6f1e8"
          roughness={0.95}
          metalness={0}
          roughnessMap={paperNoise}
          bumpMap={paperNoise}
          bumpScale={0.005}
          side={THREE.DoubleSide}
        />
      </mesh>
      </group>
    </group>
  );
}
