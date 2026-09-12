import { motion } from "framer-motion";

export default function MoltenXpBar({
  xpIntoLevel,
  needed,
  level,
  compact = false,
}: {
  xpIntoLevel: number;
  needed: number;
  level: number;
  compact?: boolean;
}) {
  const pct = needed > 0 ? Math.min(100, (xpIntoLevel / needed) * 100) : 0;

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-display text-sm font-bold tracking-wider text-foreground">
          LV {level}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {xpIntoLevel.toLocaleString()} / {needed.toLocaleString()} XP
        </span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full border border-gold/25 bg-black/50 ring-edge">
        {/* molten fill */}
        <motion.div
          className="xp-track relative h-full rounded-full"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 60, damping: 18 }}
        >
          {/* traveling specular highlight */}
          <motion.div
            aria-hidden
            className="absolute inset-y-0 w-1/3 skew-x-12 bg-white/40 blur-[3px]"
            animate={{ x: ["-120%", "340%"] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
          />
        </motion.div>
        {/* tick marks */}
        <div aria-hidden className="pointer-events-none absolute inset-0 flex justify-between px-[2px]">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="h-full w-px bg-black/35" />
          ))}
        </div>
      </div>
      {!compact && (
        <div className="mt-1.5 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {(needed - xpIntoLevel).toLocaleString()} XP to level {level + 1}
        </div>
      )}
    </div>
  );
}
