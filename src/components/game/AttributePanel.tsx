import { motion } from "framer-motion";
import { ATTRS, CATEGORY_META } from "@/convex/gameRules";
import {
  Brain,
  Dumbbell,
  HeartPulse,
  BookOpen,
  Shield,
  PenLine,
} from "lucide-react";

const ICONS = { Brain, Dumbbell, HeartPulse, BookOpen, Shield, PenLine } as const;

function Gauge({ value, max, color }: { value: number; max: number; color: string }) {
  const r = 15;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  return (
    <svg viewBox="0 0 40 40" className="size-10 -rotate-90">
      <circle cx="20" cy="20" r={r} fill="none" stroke="oklch(1 0 0 / 8%)" strokeWidth="3.5" />
      <motion.circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - pct) }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      />
      {/* tick marks */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={20 + Math.cos(a) * 18.2}
            y1={20 + Math.sin(a) * 18.2}
            x2={20 + Math.cos(a) * 19.6}
            y2={20 + Math.sin(a) * 19.6}
            stroke="oklch(1 0 0 / 15%)"
            strokeWidth="0.8"
          />
        );
      })}
    </svg>
  );
}

export default function AttributePanel({
  character,
  highlightAttr,
  highlightGain,
}: {
  character: {
    strength: number;
    intellect: number;
    wisdom: number;
    discipline: number;
    vitality: number;
    creativity: number;
  };
  highlightAttr?: string | null;
  highlightGain?: number;
}) {
  const max = Math.max(...ATTRS.map((a) => (character as any)[a] ?? 0), 10) + 4;

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6 lg:grid-cols-3">
      {ATTRS.map((attr, i) => {
        const meta = CATEGORY_META[attr];
        const value = (character as any)[attr] ?? 0;
        const color = `var(--attr-${attr})`;
        const Icon = ICONS[meta.icon as keyof typeof ICONS] ?? Brain;
        const isHot = highlightAttr === attr;
        return (
          <motion.div
            key={attr}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * i, duration: 0.4 }}
            className={`ring-edge relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${
              isHot ? "glow-violet" : ""
            }`}
            style={{
              background: isHot
                ? `oklch(from var(--attr-${attr}) 60% c h / 14%)`
                : "oklch(1 0 0 / 3%)",
            }}
            title={`${meta.label}: ${value}`}
          >
            <Gauge value={value} max={max} color={`var(--attr-${attr})`} />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <Icon className="size-3 shrink-0" style={{ color }} />
                <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {meta.label}
                </span>
              </div>
              <div className="font-mono text-lg font-bold leading-tight">
                {value}
                {isHot && highlightGain ? (
                  <motion.span
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: [0, 1, 1, 0], y: [6, 0, 0, -10] }}
                    transition={{ duration: 1.6, times: [0, 0.2, 0.7, 1] }}
                    className="ml-1 text-xs font-bold"
                    style={{ color }}
                  >
                    +{highlightGain}
                  </motion.span>
                ) : null}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
