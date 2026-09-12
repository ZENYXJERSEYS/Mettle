import { motion } from "framer-motion";
import { CATEGORY_META, DIFFICULTY_META, type Difficulty } from "@/convex/gameRules";
import {
  Brain,
  Dumbbell,
  HeartPulse,
  BookOpen,
  Shield,
  PenLine,
  Trash2,
  Check,
} from "lucide-react";

const ICONS = { Brain, Dumbbell, HeartPulse, BookOpen, Shield, PenLine } as const;

export default function QuestCard({
  quest,
  completing,
  justCompleted,
  onComplete,
  onDelete,
}: {
  quest: {
    _id: string;
    title: string;
    category: string;
    difficulty: string;
    status: string;
    xpReward: number;
    goldReward: number;
  };
  completing: boolean;
  justCompleted: boolean;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const catMeta = CATEGORY_META[quest.category] ?? CATEGORY_META.discipline;
  const diffMeta =
    DIFFICULTY_META[quest.difficulty as Difficulty] ?? DIFFICULTY_META.medium;
  const Icon = ICONS[catMeta.icon as keyof typeof ICONS] ?? Brain;
  const resolved = quest.status === "completed" || justCompleted;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{
        opacity: 1,
        y: 0,
        rotateX: 0,
        rotateY: 0,
        scale: completing ? 0.98 : 1,
      }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      whileHover={resolved ? undefined : { y: -3, rotateX: 1.2, rotateY: -1.2 }}
      className="surface-quest ring-edge grain group relative overflow-hidden rounded-xl"
      style={{ transformPerspective: 900 }}
    >
      {/* category edge light */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: `var(--attr-${quest.category})`, boxShadow: `0 0 12px var(--attr-${quest.category})` }}
      />

      <div className="flex items-center gap-3 p-3.5 pl-4.5">
        {/* engraved icon */}
        <div
          className="relative flex size-11 shrink-0 items-center justify-center rounded-lg border"
          style={{
            borderColor: `oklch(from var(--attr-${quest.category}) 60% c h / 30%)`,
            background: `oklch(from var(--attr-${quest.category}) 55% c h / 10%)`,
          }}
        >
          <Icon className="size-5" style={{ color: `var(--attr-${quest.category})` }} />
          {resolved && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -right-1 -top-1 flex size-4.5 items-center justify-center rounded-full bg-emerald-500 shadow"
            >
              <Check className="size-3 text-white" strokeWidth={3.5} />
            </motion.div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3
            className={`truncate text-sm font-semibold leading-snug ${
              resolved ? "text-muted-foreground line-through decoration-border" : ""
            }`}
          >
            {quest.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                color: `var(--attr-${quest.category})`,
                background: `oklch(from var(--attr-${quest.category}) 55% c h / 12%)`,
              }}
            >
              {catMeta.label}
            </span>
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: diffMeta.color, background: "oklch(1 0 0 / 5%)" }}
            >
              {diffMeta.label}
            </span>
            <span className="font-mono text-[11px] text-gold">+{quest.xpReward} XP</span>
            <span className="font-mono text-[11px] text-gold/60">+{quest.goldReward} G</span>
          </div>
        </div>

        {/* actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          {!resolved && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.04 }}
              onClick={onComplete}
              disabled={completing}
              aria-label={`Complete quest: ${quest.title}`}
              className="glow-violet flex size-9 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground shadow disabled:opacity-60"
            >
              <Check className="size-4.5" strokeWidth={3} />
            </motion.button>
          )}
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={onDelete}
            aria-label={`Delete quest: ${quest.title}`}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-destructive/15 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}
