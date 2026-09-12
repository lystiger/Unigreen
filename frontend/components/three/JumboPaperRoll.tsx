"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Procedural realistic industrial jumbo tissue roll.
 * Inspired directly by the physical jumbo roll reference in docs/image.png:
 *  - Accurate jumbo roll proportions (large diameter, balanced face width)
 *  - Open hollow spiral-wound kraft cardboard core with physical wall thickness
 *  - Dense concentric winding rings with micro-creping on the paper face
 *  - Soft, matte, high-diffuse virgin paper material with micro-fiber bump
 *  - Gracefully draped, undulating wavy paper strip flowing across the surface
 *  - Full 360° drag-to-rotate inertia interaction, hover parallax, and scroll-driven unwinding
 */

// --- Model dimensions (proportioned to match docs/image.png) -----------------
const ROLL_RADIUS = 1.75;
const ROLL_WIDTH = 1.35;
const CORE_OUTER_RADIUS = 0.52;
const CORE_INNER_RADIUS = 0.46; // Hollow tube wall thickness = 0.06
const BEVEL_RADIUS = 0.025; // Soft rounded outer edge
const SHEET_MAX_LEN = 5.2;
const SHEET_WIDTH = ROLL_WIDTH * 0.94;

// How many full rotations the roll makes across the scroll range
const SCROLL_TURNS = 2.5;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Ultra-realistic paper fiber & pulp roughness/bump noise (512x512).
 * Simulates micro-creping, fine organic cellulose pulp fibrils, and soft light dispersion.
 */
function makePaperNoise(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // High-frequency fine paper grain
      const grain = (Math.random() - 0.5) * 26;
      // Soft organic pulp undulations
      const pulp1 = Math.sin(x * 0.06) * Math.cos(y * 0.06) * 12;
      const pulp2 = Math.sin((x + y * 1.5) * 0.03) * 8;

      const v = Math.max(0, Math.min(255, Math.round(238 + grain + pulp1 + pulp2)));
      img.data[idx] = v;
      img.data[idx + 1] = v;
      img.data[idx + 2] = v;
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 3);
  tex.anisotropy = 8;
  return tex;
}

/**
 * Concentric wound paper end-cap texture (1024x1024).
 * Replicates the tight layered look of wound parent rolls in image.png.
 */
function makeRingTexture(): THREE.CanvasTexture {
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;

  // Luminous virgin paper base tone
  ctx.fillStyle = "#FAF8F4";
  ctx.fillRect(0, 0, size, size);

  // Soft subtle radial compression gradient (denser/darker near core)
  const radGrad = ctx.createRadialGradient(cx, cy, size * 0.14, cx, cy, size * 0.49);
  radGrad.addColorStop(0, "rgba(232, 226, 215, 0.42)");
  radGrad.addColorStop(0.3, "rgba(248, 246, 241, 0.1)");
  radGrad.addColorStop(0.95, "rgba(240, 235, 226, 0.28)");
  radGrad.addColorStop(1, "rgba(220, 214, 202, 0.5)");
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, size, size);

  // Over 340 concentric winding layers
  const totalRings = 340;
  const minR = size * 0.148; // inner core edge
  const maxR = size * 0.495; // outer paper edge

  for (let i = 0; i < totalRings; i++) {
    const t = i / totalRings;
    const r = minR + t * (maxR - minR);

    // Natural micro-variations in layer tension and sheet thickness
    const isMajorLayer = i % 14 === 0;
    const isMidLayer = i % 4 === 0;
    const alpha = isMajorLayer
      ? 0.24
      : isMidLayer
        ? 0.15
        : 0.07 + Math.sin(i * 4.2) * 0.035;
    const lineWidth = isMajorLayer ? 1.5 : isMidLayer ? 1.0 : 0.6;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = `rgba(182, 172, 156, ${alpha})`;
    ctx.stroke();
  }

  // Micro-radial fiber striations
  for (let a = 0; a < 200; a++) {
    const angle = (a / 200) * Math.PI * 2;
    const r1 = minR + Math.random() * 25;
    const r2 = maxR - Math.random() * 25;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = `rgba(195, 185, 170, ${0.03 + Math.random() * 0.04})`;
    ctx.stroke();
  }

  // Inner core shadow lip
  ctx.beginPath();
  ctx.arc(cx, cy, minR + 0.5, 0, Math.PI * 2);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "rgba(125, 95, 65, 0.4)";
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  return tex;
}

/**
 * Authentic Kraft Cardboard tube texture (512x512).
 * Replicates the brown spiral-wound industrial cardboard core seen in image.png.
 */
function makeCardboardTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;

  // Warm kraft cardboard base color
  ctx.fillStyle = "#B68B58";
  ctx.fillRect(0, 0, size, size);

  // Organic fibrous noise
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 24;
    img.data[i] = Math.max(0, Math.min(255, img.data[i]! + noise));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1]! + noise * 0.85));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2]! + noise * 0.65));
  }
  ctx.putImageData(img, 0, 0);

  // Spiral multi-ply glued cardboard seams (angled 45°)
  const seamSpacing = 90;
  for (let offset = -size; offset < size * 2; offset += seamSpacing) {
    // Darker glued groove
    ctx.beginPath();
    ctx.moveTo(0, offset);
    ctx.lineTo(size, offset + size * 0.75);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "rgba(85, 55, 30, 0.5)";
    ctx.stroke();

    // Subtle highlighted cardboard lip
    ctx.beginPath();
    ctx.moveTo(0, offset + 2.5);
    ctx.lineTo(size, offset + size * 0.75 + 2.5);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(225, 190, 145, 0.35)";
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  tex.anisotropy = 8;
  return tex;
}

/**
 * Builds the flowing, wavy unrolled paper sheet geometry matching docs/image.png.
 * Starts tangent to the lower edge of the roll and extends outward in a graceful,
 * undulating ribbon that rests realistically on the ground plane.
 */
function makeSheetGeometry(wSeg: number, hSeg: number) {
  const geo = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Compute curve points along the ribbon length (from attachment point to resting tip)
  const rows: Array<{ y: number; z: number; xOffset: number }> = [];
  const ds = SHEET_MAX_LEN / hSeg;

  // Tangent attachment point at the bottom of the roll
  const startY = -ROLL_RADIUS;
  const startZ = 0;

  for (let r = 0; r <= hSeg; r++) {
    const s = r * ds; // distance along sheet
    const t = s / SHEET_MAX_LEN; // 0 to 1

    // Organic undulating S-wave trajectory matching image.png:
    //  - Leaves the roll bottom tangent
    //  - Dips slightly down toward floor
    //  - Rises into a soft first wave crest
    //  - Slopes down to the surface
    //  - Gently flattens along the floor plane
    const wave1 = Math.sin(t * Math.PI * 2.8) * 0.32 * Math.exp(-t * 1.5);
    const wave2 = Math.sin(t * Math.PI * 5.0) * 0.08 * Math.exp(-t * 2.2);
    const floorDrop = (1 - Math.exp(-t * 3.5)) * 0.22;

    const y = startY - floorDrop + wave1 + wave2;
    // Moves forward in Z and slightly curves toward -X (beauty perspective)
    const z = startZ + s * 0.94;
    const xOffset = -Math.sin(t * Math.PI * 1.2) * 0.35 - t * 0.25;

    rows.push({ y, z, xOffset });
  }

  for (let r = 0; r <= hSeg; r++) {
    const row = rows[r]!;
    const t = r / hSeg;

    for (let cCol = 0; cCol <= wSeg; cCol++) {
      const u = cCol / wSeg;
      // Center along sheet width
      const x = (u - 0.5) * SHEET_WIDTH + row.xOffset;
      // Gentle transverse paper curling / soft sag across width
      const crossSag = Math.sin(u * Math.PI) * 0.035 * (1 - t * 0.3);
      // Subtle edge ripple for tissue realism
      const edgeRipple = Math.cos(u * Math.PI * 6 + t * 10) * 0.006 * t;

      positions.push(x, row.y - crossSag + edgeRipple, row.z);
      uvs.push(u, 1 - t);
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
  spin?: "scroll" | "auto";
  parallax?: boolean;
  baseUnroll?: number;
  interactive?: boolean;
};

export function JumboPaperRoll({
  reducedMotion,
  quality,
  spin = "auto",
  parallax = true,
  baseUnroll = 0.35,
  interactive = true,
}: Props) {
  const outerGroupRef = useRef<THREE.Group>(null);
  const rollRotationRef = useRef<THREE.Group>(null);
  const spinMantleRef = useRef<THREE.Group>(null);
  const sheetRef = useRef<THREE.Mesh>(null);

  // Live animation & interaction state refs (runs outside React renders)
  const scrollProgress = useRef(reducedMotion ? 0.4 : 0);
  const spinAngle = useRef(0);
  const sheetShown = useRef(reducedMotion ? baseUnroll : baseUnroll);

  // Dynamic user rotation & inertia physics
  const isDragging = useRef(false);
  const lastPointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const userRotation = useRef<{ x: number; y: number }>({
    x: -0.16, // Initial natural 3/4 tilt matching image.png
    y: -0.68, // Initial 3/4 yaw showing face & hollow core
  });
  const targetRotation = useRef<{ x: number; y: number }>({
    x: -0.16,
    y: -0.68,
  });
  const angularVelocity = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const radialSeg = quality === "high" ? 112 : 56;
  const sheetWSeg = quality === "high" ? 28 : 14;
  const sheetHSeg = quality === "high" ? 64 : 32;

  // --- Procedural Geometries & Textures ---------------------------------------
  const paperNoise = useMemo(() => makePaperNoise(), []);
  const ringTexture = useMemo(() => makeRingTexture(), []);
  const coreTexture = useMemo(() => makeCardboardTexture(), []);

  // Main cylindrical outer paper mantle
  const paperGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(
      ROLL_RADIUS,
      ROLL_RADIUS,
      ROLL_WIDTH - BEVEL_RADIUS * 2,
      radialSeg,
      1,
      true,
    );
    g.rotateZ(Math.PI / 2);
    return g;
  }, [radialSeg]);

  // Soft beveled rims on the outer paper edges
  const bevelGeo = useMemo(() => {
    const g = new THREE.TorusGeometry(
      ROLL_RADIUS - BEVEL_RADIUS,
      BEVEL_RADIUS,
      16,
      radialSeg,
    );
    g.rotateY(Math.PI / 2);
    return g;
  }, [radialSeg]);

  // Concentric wound paper end caps (annulus)
  const capGeo = useMemo(
    () =>
      new THREE.RingGeometry(
        CORE_OUTER_RADIUS,
        ROLL_RADIUS - BEVEL_RADIUS,
        radialSeg,
        4,
      ),
    [radialSeg],
  );

  // Hollow cardboard core outer tube
  const coreOuterGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(
      CORE_OUTER_RADIUS,
      CORE_OUTER_RADIUS,
      ROLL_WIDTH * 1.002,
      radialSeg,
      1,
      true,
    );
    g.rotateZ(Math.PI / 2);
    return g;
  }, [radialSeg]);

  // Hollow cardboard core inner tube
  const coreInnerGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(
      CORE_INNER_RADIUS,
      CORE_INNER_RADIUS,
      ROLL_WIDTH * 1.002,
      radialSeg,
      1,
      true,
    );
    g.rotateZ(Math.PI / 2);
    return g;
  }, [radialSeg]);

  // Cardboard core end lip rings
  const coreLipGeo = useMemo(
    () => new THREE.RingGeometry(CORE_INNER_RADIUS, CORE_OUTER_RADIUS, radialSeg),
    [radialSeg],
  );

  // Draped flowing unrolled paper sheet
  const sheet = useMemo(
    () => makeSheetGeometry(sheetWSeg, sheetHSeg),
    [sheetWSeg, sheetHSeg],
  );

  // Dispose GPU resources on unmount
  useEffect(() => {
    return () => {
      [paperNoise, ringTexture, coreTexture].forEach((t) => t.dispose());
      [
        paperGeo,
        bevelGeo,
        capGeo,
        coreOuterGeo,
        coreInnerGeo,
        coreLipGeo,
        sheet.geo,
      ].forEach((g) => g.dispose());
    };
  }, [
    paperNoise,
    ringTexture,
    coreTexture,
    paperGeo,
    bevelGeo,
    capGeo,
    coreOuterGeo,
    coreInnerGeo,
    coreLipGeo,
    sheet.geo,
  ]);

  // --- Scroll Tracking -------------------------------------------------------
  useEffect(() => {
    if (reducedMotion) return;
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
  }, [reducedMotion]);

  // --- Smooth Pointer Drag & Inertia Listeners -------------------------------
  useEffect(() => {
    if (!interactive || reducedMotion) return;

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPointerPos.current.x;
      const dy = e.clientY - lastPointerPos.current.y;
      lastPointerPos.current = { x: e.clientX, y: e.clientY };

      const sensitivity = 0.007;
      targetRotation.current.y += dx * sensitivity;
      // Clamp pitch so roll doesn't flip upside down
      targetRotation.current.x = Math.max(
        -0.85,
        Math.min(0.65, targetRotation.current.x + dy * sensitivity),
      );

      angularVelocity.current = {
        x: dy * sensitivity,
        y: dx * sensitivity,
      };
    };

    const onPointerUp = () => {
      isDragging.current = false;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [interactive, reducedMotion]);

  // --- Per-frame Physics & Animation Loop ------------------------------------
  useFrame((state, delta) => {
    // 1. Rotation physics & user drag damping
    if (isDragging.current) {
      userRotation.current.x = lerp(
        userRotation.current.x,
        targetRotation.current.x,
        0.35,
      );
      userRotation.current.y = lerp(
        userRotation.current.y,
        targetRotation.current.y,
        0.35,
      );
    } else {
      // Apply momentum inertia with smooth friction
      if (Math.abs(angularVelocity.current.y) > 0.0001) {
        targetRotation.current.y += angularVelocity.current.y;
        targetRotation.current.x = Math.max(
          -0.85,
          Math.min(0.65, targetRotation.current.x + angularVelocity.current.x),
        );
        angularVelocity.current.x *= 0.92;
        angularVelocity.current.y *= 0.92;
      } else {
        // Gentle ambient idle spin when untouched
        if (!reducedMotion && spin === "auto") {
          targetRotation.current.y += delta * 0.12;
        }
      }
      userRotation.current.x = lerp(
        userRotation.current.x,
        targetRotation.current.x,
        0.15,
      );
      userRotation.current.y = lerp(
        userRotation.current.y,
        targetRotation.current.y,
        0.15,
      );
    }

    // 2. Parallax hover tilt
    let parallaxX = 0;
    let parallaxY = 0;
    if (parallax && !reducedMotion && !isDragging.current) {
      parallaxX = state.pointer.x * 0.12;
      parallaxY = state.pointer.y * 0.08;
    }

    if (rollRotationRef.current) {
      rollRotationRef.current.rotation.y = userRotation.current.y + parallaxX;
      rollRotationRef.current.rotation.x = userRotation.current.x - parallaxY;
    }

    // 3. Roll unwinding and flowing sheet target
    const p = scrollProgress.current;
    let sheetTarget: number;

    if (spin === "scroll") {
      const targetSpin = p * SCROLL_TURNS * Math.PI * 2;
      spinAngle.current = lerp(spinAngle.current, targetSpin, reducedMotion ? 1 : 0.12);
      sheetTarget = baseUnroll + p * (1 - baseUnroll);
    } else {
      // In auto/hero mode, subtle idle wave pulsation
      const idleWave = reducedMotion
        ? 0
        : Math.sin(state.clock.elapsedTime * 1.5) * 0.02;
      sheetTarget = Math.min(1, Math.max(0.1, baseUnroll + p * 0.6 + idleWave));
      spinAngle.current += delta * 0.08;
    }

    if (spinMantleRef.current) {
      spinMantleRef.current.rotation.x = spinAngle.current;
    }

    // 4. Reveal the draped sheet smoothly from roll to tip
    sheetShown.current = lerp(
      sheetShown.current,
      sheetTarget,
      reducedMotion ? 1 : 0.12,
    );
    if (sheetRef.current) {
      const rowsVisible = Math.round(sheetShown.current * sheet.hSeg);
      const count = rowsVisible * sheet.wSeg * 6;
      sheetRef.current.geometry.setDrawRange(0, count);
      sheetRef.current.visible = count > 0;
    }
  });

  return (
    <group
      ref={outerGroupRef}
      onPointerDown={(e) => {
        if (!interactive || reducedMotion) return;
        isDragging.current = true;
        lastPointerPos.current = { x: e.clientX, y: e.clientY };
        angularVelocity.current = { x: 0, y: 0 };
      }}
    >
      {/* 3/4 Angle Roll Group */}
      <group ref={rollRotationRef}>
        {/* The rotating paper roll body & core */}
        <group ref={spinMantleRef}>
          {/* Main cylindrical outer tissue paper mantle */}
          <mesh geometry={paperGeo} castShadow receiveShadow>
            <meshStandardMaterial
              color="#FAF8F5"
              roughness={0.92}
              metalness={0.0}
              roughnessMap={paperNoise}
              bumpMap={paperNoise}
              bumpScale={0.0024}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Soft beveled outer edges */}
          {([1, -1] as const).map((dir) => (
            <mesh
              key={`bevel-${dir}`}
              geometry={bevelGeo}
              position={[dir * (ROLL_WIDTH / 2 - BEVEL_RADIUS), 0, 0]}
              castShadow
            >
              <meshStandardMaterial
                color="#F8F6F2"
                roughness={0.92}
                metalness={0.0}
                bumpMap={paperNoise}
                bumpScale={0.002}
              />
            </mesh>
          ))}

          {/* Concentric wound paper end caps */}
          {([1, -1] as const).map((dir) => (
            <mesh
              key={`cap-${dir}`}
              geometry={capGeo}
              position={[dir * (ROLL_WIDTH / 2 - 0.0005), 0, 0]}
              rotation={[0, (dir * Math.PI) / 2, 0]}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial
                map={ringTexture}
                roughness={0.94}
                metalness={0.0}
                bumpMap={paperNoise}
                bumpScale={0.0018}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}

          {/* Hollow Kraft Cardboard Core: Outer Tube */}
          <mesh geometry={coreOuterGeo} castShadow receiveShadow>
            <meshStandardMaterial
              color="#BA8F5C"
              map={coreTexture}
              roughness={0.88}
              metalness={0.0}
            />
          </mesh>

          {/* Hollow Kraft Cardboard Core: Inner Tube Wall */}
          <mesh geometry={coreInnerGeo} receiveShadow>
            <meshStandardMaterial
              color="#A87F4E"
              map={coreTexture}
              roughness={0.9}
              metalness={0.0}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Hollow Kraft Cardboard Core: End Rim Lips */}
          {([1, -1] as const).map((dir) => (
            <mesh
              key={`core-lip-${dir}`}
              geometry={coreLipGeo}
              position={[dir * (ROLL_WIDTH / 2 + 0.001), 0, 0]}
              rotation={[0, (dir * Math.PI) / 2, 0]}
              castShadow
            >
              <meshStandardMaterial
                color="#B08654"
                map={coreTexture}
                roughness={0.92}
                metalness={0.0}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
        </group>

        {/* Draped flowing wavy unrolled paper sheet (hung from roll bottom) */}
        <mesh
          ref={sheetRef}
          geometry={sheet.geo}
          position={[0, 0, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color="#FCFAF6"
            roughness={0.9}
            metalness={0.0}
            roughnessMap={paperNoise}
            bumpMap={paperNoise}
            bumpScale={0.0022}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}
