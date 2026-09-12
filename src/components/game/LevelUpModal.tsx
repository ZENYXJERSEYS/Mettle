import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Coins, Sparkles } from "lucide-react";
import HeroStage from "@/components/hero/HeroStage";
import type { HeroState } from "@/components/hero/HeroCrystal";
import { formForLevel } from "@/convex/gameRules";

export interface LevelUpData {
  newLevel: number;
  gold: number;
  attrPoints: number;
  newTitle?: string;
}

const SEQ_MS = 3000;

export default function LevelUpModal({
  data,
  onClose,
}: {
  data: LevelUpData | null;
  onClose: () => void;
}) {
  const [heroState, setHeroState] = useState<HeroState>("idle");
  const [stage, setStage] = useState(0); // 0 hidden, 1 hero, 2 level lands, 3 rewards

  // drive the staged sequence
  useEffect(() => {
    if (!data) {
      setStage(0);
      setHeroState("idle");
      return;
    }
    setStage(1);
    setHeroState("levelup");
    const t1 = setTimeout(() => setStage(2), 1400);
    const t2 = setTimeout(() => setStage(3), 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [data]);

  // auto-close shortly after sequence completes
  useEffect(() => {
    if (stage === 3) {
      const t = setTimeout(onClose, 2600);
      return () => clearTimeout(t);
    }
  }, [stage, onClose]);

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          key="levelup-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 50% 45%, oklch(0.1 0.03 290 / 88%), oklch(0.06 0.02 285 / 96%))",
            backdropFilter: "blur(6px)",
          }}
          role="dialog"
          aria-modal="true"
          aria-label={`Level up! You reached level ${data.newLevel}`}
        >
          <div className="relative flex w-full max-w-md flex-col items-center text-center">
            {/* hero transformation */}
            <div className="h-56 w-56 sm:h-64 sm:w-64">
              <HeroStage form={formForLevel(data.newLevel)} level={data.newLevel} state={heroState} />
            </div>

            {/* level number lands */}
            {stage >= 2 && (
              <motion.div
                initial={{ scale: 2.4, opacity: 0, filter: "blur(8px)" }}
                animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="-mt-8"
              >
                <div className="text-[11px] font-bold uppercase tracking-[0.35em] text-primary/80">
                  Level Up
                </div>
                <div className="font-display text-gradient-violet text-6xl font-black leading-none sm:text-7xl">
                  {data.newLevel}
                </div>
              </motion.div>
            )}

            {/* reward reveal */}
            {stage >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="mt-4 flex flex-col items-center gap-3"
              >
                <div className="flex items-center gap-2">
                  <span className="glow-gold flex items-center gap-1.5 rounded-full bg-gold/10 px-3.5 py-1.5 text-sm font-bold text-gold">
                    <Coins className="size-4" />+{data.gold} Gold
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-bold text-primary">
                    <Sparkles className="size-4" />+{data.attrPoints} Attribute
                  </span>
                </div>
                {data.newTitle && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="font-display text-lg font-bold tracking-wide text-gradient-gold"
                  >
                    Title earned: “{data.newTitle}”
                  </motion.div>
                )}
                <button
                  onClick={onClose}
                  className="mt-2 rounded-lg px-6 py-2 text-sm font-semibold text-foreground/80 ring-1 ring-border transition hover:bg-secondary/50"
                >
                  Continue
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
