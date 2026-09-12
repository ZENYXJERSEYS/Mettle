import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type HeroState = "idle" | "pulse" | "levelup";

/** One equipped relic, as returned by api.shop.getMyEquipped. */
export type EquippedItem = {
  key: string;
  name: string;
  tint: string;
  rarity: string;
  category: string;
  materialType?: string;
  titleGrant?: string;
};

/** Equipped loot keyed by category — drives colors + material treatment. */
export type EquippedMap = Record<string, EquippedItem | undefined>;

/** Inline float: gentle vertical bob + sway (replaces drei's Float). */
function FloatGroup({
  children,
  speed = 1.4,
  bob = 0.12,
  sway = 0.06,
}: {
  children: React.ReactNode;
  speed?: number;
  bob?: number;
  sway?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    const g = ref.current;
    if (!g) return;
    const t = s.clock.elapsedTime * speed;
    g.position.y = Math.sin(t) * bob;
    g.rotation.x = Math.sin(t * 0.7) * sway;
    g.rotation.z = Math.cos(t * 0.5) * sway;
  });
  return <group ref={ref}>{children}</group>;
}

/** Inline GPU particle dust (replaces drei's Sparkles). */
function EnergyDust({
  count,
  color,
  scale = 4.2,
}: {
  count: number;
  color: string;
  scale?: number;
}) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // random point in a sphere-ish shell
      const r = 1.2 + Math.random() * (scale / 2.4);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count, scale]);

  useFrame((s) => {
    if (points.current) {
      points.current.rotation.y = s.clock.elapsedTime * 0.08;
      points.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.15) * 0.1;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.045}
        sizeAttenuation
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Rarity → material treatment for the crystal shell. */
function rarityMaterial(rarity: string | undefined) {
  switch (rarity) {
    case "mythic":
      return { roughness: 0.05, metalness: 0.25, transmission: 0.95, clearcoat: 1, glow: 1.35 };
    case "legendary":
      return { roughness: 0.06, metalness: 0.2, transmission: 0.9, clearcoat: 0.9, glow: 1.2 };
    case "epic": // polished metal
      return { roughness: 0.08, metalness: 0.75, transmission: 0.35, clearcoat: 1, glow: 1 };
    case "rare": // violet glass
      return { roughness: 0.15, metalness: 0.25, transmission: 0.75, clearcoat: 0.8, glow: 0.9 };
    case "uncommon": // cyan energy
      return { roughness: 0.22, metalness: 0.15, transmission: 0.6, clearcoat: 0.5, glow: 0.8 };
    default: // matte slate
      return { roughness: 0.4, metalness: 0.05, transmission: 0.4, clearcoat: 0.2, glow: 0.65 };
  }
}

interface CrystalProps {
  form: number; // 1..4 visual tier
  level: number;
  state: HeroState;
  tint?: string | null; // simple aura-tint override (kept for compat)
  equipped?: EquippedMap | null; // full equipped loot by category
}

const FORM_COLORS: Record<number, { shell: string; core: string; rim: string }> = {
  1: { shell: "#8b7fd4", core: "#7dd3fc", rim: "#a78bfa" },
  2: { shell: "#a78bfa", core: "#67e8f9", rim: "#c4b5fd" },
  3: { shell: "#7dd3fc", core: "#fbbf24", rim: "#a5f3fc" },
  4: { shell: "#f0abfc", core: "#fde68a", rim: "#f5d0fe" },
};

function CoreCrystal({ form, level, state, tint, equipped }: CrystalProps) {
  const group = useRef<THREE.Group>(null);
  const shell = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  const ringsRef = useRef<THREE.Group>(null);
  const burstLight = useRef<THREE.PointLight>(null);
  const phase = useRef<{ t: number; active: string }>({ t: 0, active: state });

  const base = FORM_COLORS[Math.min(4, Math.max(1, form))];
  // category-specific loot: aura → glow color; core → inner energy; skin → shell
  const auraTint = equipped?.aura?.tint ?? tint ?? null;
  const coreTint = equipped?.core?.tint ?? null;
  const skinTint = equipped?.skin?.tint ?? null;
  const colors = {
    shell: skinTint ?? auraTint ?? base.shell,
    core: coreTint ?? auraTint ?? base.core,
    rim: auraTint ?? base.rim,
  };
  const ringCount = useMemo(() => Math.min(1 + form, 4), [form]);
  const mat = rarityMaterial(equipped?.aura?.rarity);

  const effectGlow = equipped?.effect ? 1.35 : 1;

  // Reset phase when state changes (replay-safe)
  useEffect(() => {
    phase.current = { t: 0, active: state };
  }, [state]);

  useFrame((s, delta) => {
    const g = group.current;
    if (!g) return;
    const d = Math.min(delta, 0.05);
    const p = phase.current;
    p.t += d;

    // Pointer parallax (desktop, always subtle)
    const px = s.pointer.x;
    const py = s.pointer.y;
    g.rotation.y += d * 0.25;
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, py * 0.18, 0.06);
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, px * -0.08, 0.06);

    if (p.active === "idle") {
      // breathing
      const breathe = 1 + Math.sin(s.clock.elapsedTime * 0.9) * 0.025;
      g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, breathe, 0.08));
      if (inner.current) {
        const m = inner.current.material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = (1.4 + Math.sin(s.clock.elapsedTime * 1.3) * 0.35) * effectGlow;
      }
      if (burstLight.current) burstLight.current.intensity = 0;
      if (ringsRef.current) {
        ringsRef.current.rotation.z += d * 0.1;
        ringsRef.current.scale.setScalar(THREE.MathUtils.lerp(ringsRef.current.scale.x, 1, 0.05));
      }
    } else if (p.active === "pulse") {
      // 1.2s completion flash: punch scale + emissive spike + settle
      const T = 1.2;
      const t = p.t;
      const punch = t < 0.18 ? 1 + t * 1.4 : t < 0.5 ? 1.25 - (t - 0.18) * 0.78 : 1 + Math.sin((t - 0.5) * 8) * 0.03 * Math.max(0, 1 - (t - 0.5));
      g.scale.setScalar(punch);
      if (inner.current) {
        const m = inner.current.material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = 1.4 + Math.max(0, 1 - t / 0.6) * 4;
      }
      if (burstLight.current) burstLight.current.intensity = Math.max(0, 1 - t / 0.45) * 30;
      if (t >= T) p.active = "idle";
    } else if (p.active === "levelup") {
      // 2.6s staged transformation
      const T = 2.6;
      const t = p.t;
      // 0–0.7 gather: rings spin up, scale in; 0.7–1.2 crack: shake; 1.2–1.8 burst: flash+expand; 1.8–2.6 settle
      if (t < 0.7) {
        const k = t / 0.7;
        g.scale.setScalar(1 - k * 0.12);
        g.rotation.y += d * (2 + k * 6);
        if (ringsRef.current) ringsRef.current.scale.setScalar(1 + k * 0.4);
      } else if (t < 1.2) {
        g.scale.setScalar(0.88 + Math.sin(t * 60) * 0.02);
        g.rotation.y += d * 8;
      } else if (t < 1.8) {
        const k = (t - 1.2) / 0.6;
        g.scale.setScalar(0.88 + k * 0.5 * (1 - Math.pow(1 - k, 2)));
        if (burstLight.current) burstLight.current.intensity = Math.max(0, 1 - k) * 90;
        if (ringsRef.current) ringsRef.current.scale.setScalar(1.4 - k * 0.3);
      } else {
        const k = (t - 1.8) / (T - 1.8);
        g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, 1.06 - k * 0.06, 0.12));
        g.rotation.y += d * 0.4;
        if (burstLight.current) burstLight.current.intensity *= 0.9;
      }
      if (inner.current) {
        const m = inner.current.material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = t < 1.2 ? 1.4 + t * 3 : 1.4 + Math.max(0, 1 - (t - 1.2) / 1.0) * 5;
      }
      if (t >= T) p.active = "idle";
    }
  });

  return (
    <group ref={group}>
      {/* outer crystal shell — material treatment from equipped rarity */}
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.15, form >= 3 ? 1 : 0]} />
        <meshPhysicalMaterial
          color={colors.shell}
          roughness={mat.roughness}
          metalness={mat.metalness}
          transmission={mat.transmission}
          thickness={1.6}
          ior={1.45}
          clearcoat={mat.clearcoat}
          clearcoatRoughness={0.25}
          emissive={colors.rim}
          emissiveIntensity={0.12 * mat.glow}
          transparent
          opacity={0.92}
          flatShading
        />
      </mesh>

      {/* inner energy core */}
      <mesh ref={inner} scale={0.55}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={colors.core}
          emissive={colors.core}
          emissiveIntensity={1.4}
          roughness={0.2}
          metalness={0.4}
          flatShading
        />
      </mesh>

      {/* orbiting rings — count grows with form */}
      <group ref={ringsRef}>
        {Array.from({ length: ringCount }).map((_, i) => (
          <mesh key={i} rotation={[Math.PI / 2.4 + i * 0.55, i * 0.9, i * 0.35]}>
            <torusGeometry args={[1.55 + i * 0.22, 0.012 + i * 0.004, 8, 96]} />
            <meshStandardMaterial
              color={colors.rim}
              emissive={colors.rim}
              emissiveIntensity={1.1}
              roughness={0.3}
              metalness={0.7}
            />
          </mesh>
        ))}
      </group>

      {/* level marker fragments — one shard per unlocked form tier */}
      {Array.from({ length: form }).map((_, i) => {
        const a = (i / form) * Math.PI * 2;
        return (
          <mesh key={`f${i}`} position={[Math.cos(a) * 1.95, Math.sin(a * 2) * 0.3, Math.sin(a) * 1.95]} scale={0.09}>
            <tetrahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={colors.core} emissive={colors.core} emissiveIntensity={1.6} flatShading />
          </mesh>
        );
      })}

      {/* burst light for pulse/levelup */}
      <pointLight ref={burstLight} color={colors.core} intensity={0} distance={8} />

      {/* ambient energy dust */}
      <EnergyDust count={form * 18} color={colors.core} scale={4.2} />
    </group>
  );
}

export default function HeroCrystal({ form, level, state, tint, equipped }: CrystalProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.4, 4.6], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 4]} intensity={1.1} color="#c4b5fd" />
      <pointLight position={[-4, -2, 2]} intensity={0.5} color="#7dd3fc" />
      <pointLight position={[3, 2, -3]} intensity={0.7} color="#a78bfa" />
      <FloatGroup speed={1.4} bob={0.12} sway={0.06}>
        <CoreCrystal form={form} level={level} state={state} tint={tint} equipped={equipped} />
      </FloatGroup>
    </Canvas>
  );
}
