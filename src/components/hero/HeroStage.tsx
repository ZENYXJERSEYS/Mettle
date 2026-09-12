import { lazy, Suspense, useEffect, useState } from "react";
import type { HeroState } from "./HeroCrystal";

const HeroCrystal = lazy(() => import("./HeroCrystal"));

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

function useWebGLAvailable() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setOk(!!(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}

const FALLBACK_COLORS: Record<number, string> = {
  1: "#8b7fd4",
  2: "#a78bfa",
  3: "#7dd3fc",
  4: "#f0abfc",
};

/** Static CSS fallback mirroring the crystal's identity. */
function CrystalFallback({ form, state, tint }: { form: number; state: HeroState; tint?: string | null }) {
  const color = tint ?? FALLBACK_COLORS[Math.min(4, Math.max(1, form))];
  const glow =
    state === "levelup" ? 0.9 : state === "pulse" ? 0.65 : 0.35;
  return (
    <div className="flex h-full w-full items-center justify-center" aria-hidden>
      <div
        className="relative flex items-center justify-center rounded-[28%] transition-all duration-500"
        style={{
          width: "46%",
          aspectRatio: "1",
          background: `conic-gradient(from 140deg, ${color}33, ${color}66, ${color}22, ${color}55, ${color}33)`,
          boxShadow: `0 0 ${60 * glow + 20}px ${color}${Math.round(glow * 180).toString(16).padStart(2, "0")}, inset 0 0 40px ${color}44`,
          transform: `rotate(45deg) scale(${1 + glow * 0.08})`,
        }}
      >
        <div
          className="rounded-[24%]"
          style={{
            width: "42%",
            aspectRatio: "1",
            background: `radial-gradient(circle, #fff8, ${color})`,
            boxShadow: `0 0 ${30 * glow + 10}px ${color}`,
            transform: "rotate(0deg)",
          }}
        />
      </div>
    </div>
  );
}

export default function HeroStage({
  form,
  level,
  state,
  tint,
  className,
}: {
  form: number;
  level: number;
  state: HeroState;
  tint?: string | null;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const webgl = useWebGLAvailable();
  const canRender3D = webgl === true && !reduced;

  return (
    <div className={`relative ${className ?? ""}`}>
      {canRender3D ? (
        <Suspense fallback={<CrystalFallback form={form} state="idle" />}>
          <HeroCrystal form={form} level={level} state={state} tint={tint} />
        </Suspense>
      ) : (
        <CrystalFallback form={form} state={reduced ? "idle" : state} />
      )}
      {/* atmospheric floor glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 bottom-0 h-10 rounded-full blur-2xl"
        style={{ background: "radial-gradient(ellipse, oklch(0.68 0.19 295 / 25%), transparent 70%)" }}
      />
    </div>
  );
}
