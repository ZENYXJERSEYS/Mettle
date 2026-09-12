import { motion } from "framer-motion";
import {
  Swords,
  PlusCircle,
  Trophy,
  Flame,
  Sparkles,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

const KIND_ICON: Record<string, LucideIcon> = {
  quest_completed: Swords,
  quest_created: PlusCircle,
  level_up: Trophy,
  milestone: Flame,
  purchase: ShoppingBag,
};

const KIND_COLOR: Record<string, string> = {
  quest_completed: "var(--attr-vitality)",
  quest_created: "var(--attr-intellect)",
  level_up: "var(--gold)",
  milestone: "var(--attr-creativity)",
  purchase: "var(--attr-creativity)",
};

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function AdventureLog({
  entries,
  className,
}: {
  entries:
    | {
        _id: string;
        kind: string;
        message: string;
        icon: string;
        xp?: number | undefined;
        gold?: number | undefined;
        createdAt: number;
      }[]
    | undefined;
  className?: string;
}) {
  if (!entries) {
    return (
      <div className={`surface-panel ring-edge rounded-xl p-5 ${className ?? ""}`} aria-busy="true">
        <div className="mb-4 text-sm font-semibold">Adventure Log</div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="mb-3 flex items-center gap-3">
            <div className="size-8 animate-pulse rounded-lg bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className={`surface-panel ring-edge rounded-xl p-5 ${className ?? ""}`} aria-label="Adventure Log">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Adventure Log
        </h2>
        <span className="font-mono text-[10px] text-muted-foreground/60">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Sparkles className="size-6 text-muted-foreground/40" />
          <h3 className="font-display text-sm font-black tracking-widest">
            YOUR CHRONICLE HAS NOT BEGUN
          </h3>
          <p className="text-xs text-muted-foreground">
            Complete a real-world quest to write your first entry.
          </p>
        </div>
      ) : (
        <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
          {entries.map((e, i) => {
            const Icon = KIND_ICON[e.kind] ?? Sparkles;
            const color = KIND_COLOR[e.kind] ?? "var(--primary)";
            return (
              <motion.li
                key={e._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(0.04 * i, 0.3), duration: 0.3 }}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary/40"
              >
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `oklch(from ${color} 55% c h / 12%)` }}
                >
                  <Icon className="size-4" style={{ color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{e.message}</div>
                  <div className="text-[11px] text-muted-foreground/70">{timeAgo(e.createdAt)}</div>
                </div>
                {e.kind === "quest_completed" && (
                  <div className="shrink-0 text-right font-mono text-[11px]">
                    <div className="text-gold">+{e.xp} XP</div>
                    <div className="text-gold/60">+{e.gold} G</div>
                  </div>
                )}
                {e.kind === "level_up" && (
                  <span className="shrink-0 rounded bg-gold/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-gold">
                    LVL UP
                  </span>
                )}
                {e.kind === "purchase" && e.gold != null && (
                  <div className="shrink-0 font-mono text-[11px] text-gold/70">{e.gold} G</div>
                )}
              </motion.li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
