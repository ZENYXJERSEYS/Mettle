import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation } from "convex/react";
import { Check, Loader2, Save, SkipForward, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { reflectionPromptFor, MAX_REFLECTION_LEN } from "@/convex/gameRules";

export type TruthfulStage = "confirm" | "reflect" | "notYet";

export interface TruthfulQuest {
  _id: string;
  title: string;
  category: string;
  xpReward: number;
  goldReward: number;
}

interface Props {
  quest: TruthfulQuest | null;
  stage: TruthfulStage | null;
  /** id of the persisted questCompletions row, present during "reflect" */
  completionId: string | null;
  onClose: () => void;
  /** user answered the honesty prompt — true = "Yes, I completed it" */
  onConfirm: (honest: boolean) => void;
}

export default function TruthfulCompletionModal({
  quest,
  stage,
  completionId,
  onClose,
  onConfirm,
}: Props) {
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const saveReflection = useMutation(api.quests.saveReflection);

  const prompt = quest ? reflectionPromptFor(quest.category) : "";

  // reset draft whenever the dialog opens for a quest
  useEffect(() => {
    setReflection("");
    if (stage === "reflect") {
      const t = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [stage, quest?._id]);

  // Escape closes
  useEffect(() => {
    if (!stage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, onClose]);

  const handleSave = async () => {
    if (!completionId) return;
    setSaving(true);
    try {
      await saveReflection({ completionId: completionId as never, text: reflection });
      toast.success("Reflection saved to your Adventure Log");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save reflection");
    } finally {
      setSaving(false);
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {stage && quest && (
        <motion.div
          key="truthful-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Truthful completion"
        >
          {/* dim + blur */}
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 18 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-2xl sm:p-7"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
            </button>

            {/* ── stage: confirm ─────────────────────────────────── */}
            {stage === "confirm" && (
              <div className="text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/12 ring-1 ring-primary/30">
                  <Check className="size-6 text-primary" strokeWidth={2.5} />
                </div>

                <h2 className="font-display text-lg font-black tracking-[0.14em]">
                  BE TRUTHFUL TO YOURSELF
                </h2>
                <p className="mt-3 text-sm font-medium text-foreground/90">
                  Did you genuinely complete this quest?
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  XP is not knowledge.
                  <br />
                  Gold is not growth.
                  <br />
                  They are small tokens to make your progress visible and keep you moving.
                </p>
                <p className="mt-3 text-sm font-medium text-foreground/90">
                  Your real reward is what you learned, built, practiced, or became.
                </p>
                <p className="mt-4 truncate rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground" title={quest.title}>
                  {quest.title}
                </p>

                <div className="mt-6 grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    autoFocus
                    onClick={() => onConfirm(true)}
                    className="glow-violet rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
                  >
                    Yes, I completed it
                  </button>
                  <button
                    type="button"
                    onClick={() => onConfirm(false)}
                    className="rounded-xl border border-border/60 bg-secondary/40 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary/70 active:scale-[0.98]"
                  >
                    Not yet
                  </button>
                </div>
              </div>
            )}

            {/* ── stage: reflect ─────────────────────────────────── */}
            {stage === "reflect" && (
              <div>
                <h2 className="font-display text-lg font-black tracking-[0.14em]">
                  MAKE IT COUNT
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  What did you actually gain from this quest?
                </p>

                <label htmlFor="reflection-input" className="mt-5 block text-sm font-medium">
                  {prompt}
                </label>
                <textarea
                  id="reflection-input"
                  ref={inputRef}
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  maxLength={MAX_REFLECTION_LEN}
                  rows={3}
                  placeholder="Write one honest sentence..."
                  className="mt-2 w-full resize-none rounded-xl border border-input bg-secondary/30 px-3.5 py-3 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                />
                <div className="mt-1 text-right font-mono text-[10px] text-muted-foreground/60">
                  {reflection.length}/{MAX_REFLECTION_LEN}
                </div>

                <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || reflection.trim().length === 0}
                    className="glow-violet flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Save to Adventure Log
                  </button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-secondary/40 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary/70 active:scale-[0.98]"
                  >
                    <SkipForward className="size-4" />
                    Skip for now
                  </button>
                </div>
              </div>
            )}

            {/* ── stage: not yet ─────────────────────────────────── */}
            {stage === "notYet" && (
              <div className="text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-secondary/60 ring-1 ring-border/60">
                  <Check className="size-5 text-muted-foreground" strokeWidth={2.5} />
                </div>
                <h2 className="font-display text-lg font-black tracking-[0.14em]">
                  THAT'S OKAY
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Your progress is still here.
                  <br />
                  Return when you're ready to complete the quest honestly.
                </p>
                <button
                  type="button"
                  autoFocus
                  onClick={onClose}
                  className="mt-6 w-full rounded-xl border border-border/60 bg-secondary/40 py-3 text-sm font-bold transition hover:bg-secondary/70 active:scale-[0.98]"
                >
                  Keep Quest Active
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
