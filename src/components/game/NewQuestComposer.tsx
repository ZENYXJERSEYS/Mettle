import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, Plus, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_META, DIFFICULTY_META, type Difficulty } from "@/convex/gameRules";
import {
  Brain,
  Dumbbell,
  HeartPulse,
  BookOpen,
  Shield,
  PenLine,
} from "lucide-react";

const ICONS = { Brain, Dumbbell, HeartPulse, BookOpen, Shield, PenLine } as const;

export default function NewQuestComposer() {
  const create = useMutation(api.quests.createQuest);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("intellect");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = DIFFICULTY_META[difficulty];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await create({ title, category, difficulty });
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create quest");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Swords className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New quest — e.g. Study calculus for 25 minutes"
            maxLength={80}
            disabled={busy}
            aria-label="Quest title"
            className="border-border/60 bg-black/25 pl-9 placeholder:text-muted-foreground/50"
          />
        </div>
        <Button
          type="submit"
          disabled={busy || title.trim().length < 3}
          className="glow-violet shrink-0 font-semibold"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Accept
        </Button>
      </div>

      {/* category rail */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(CATEGORY_META).map(([key, m]) => {
          const Icon = ICONS[m.icon as keyof typeof ICONS] ?? Brain;
          const active = category === key;
          return (
            <motion.button
              key={key}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => setCategory(key)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1 transition-all ${
                active ? "" : "ring-border/60 text-muted-foreground hover:text-foreground"
              }`}
              style={
                active
                  ? {
                      color: `var(--attr-${key})`,
                      background: `oklch(from var(--attr-${key}) 55% c h / 13%)`,
                      // @ts-expect-error css var
                      "--tw-ring-color": `oklch(from var(--attr-${key}) 60% c h / 35%)`,
                    }
                  : undefined
              }
            >
              <Icon className="size-3.5" />
              {m.label}
            </motion.button>
          );
        })}
      </div>

      {/* difficulty rail with reward preview */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(Object.keys(DIFFICULTY_META) as Difficulty[]).map((d) => {
          const active = difficulty === d;
          return (
            <motion.button
              key={d}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => setDifficulty(d)}
              aria-pressed={active}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1 transition-all ${
                active ? "bg-gold/15 text-gold ring-gold/40" : "ring-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {DIFFICULTY_META[d].label}
            </motion.button>
          );
        })}
        <motion.span
          key={difficulty}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          className="ml-auto font-mono text-xs text-gold"
        >
          reward: +{meta.xp} XP · +{meta.gold} G · +{meta.attrGain} {CATEGORY_META[category].attr}
        </motion.span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
