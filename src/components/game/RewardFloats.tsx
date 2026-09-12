import { AnimatePresence, motion } from "framer-motion";
import { Coins } from "lucide-react";

export interface RewardPayload {
  xp: number;
  gold: number;
  attr: string;
  attrGain: number;
}

/** Staged reward floats — rise in separate readable layers. */
export default function RewardFloats({
  reward,
  onDone,
}: {
  reward: RewardPayload | null;
  onDone: () => void;
}) {
  return (
    <AnimatePresence>
      {reward && (
        <div className="pointer-events-none fixed inset-x-0 top-24 z-40 flex flex-col items-center gap-1">
          <motion.div
            key="xp"
            initial={{ opacity: 0, y: 24, scale: 0.85 }}
            animate={{ opacity: [0, 1, 1, 0], y: [24, -6, -18, -34], scale: 1 }}
            transition={{ duration: 1.9, times: [0, 0.15, 0.7, 1] }}
            onAnimationComplete={onDone}
            className="font-display rounded-full bg-gold/15 px-4 py-1 text-2xl font-black text-gold ring-1 ring-gold/40 backdrop-blur-sm"
          >
            +{reward.xp} XP
          </motion.div>
          <motion.div
            key="gold"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: [0, 1, 1, 0], y: [20, -4, -14, -28] }}
            transition={{ duration: 1.9, delay: 0.25, times: [0, 0.15, 0.7, 1] }}
            className="flex items-center gap-1.5 rounded-full bg-gold/10 px-3.5 py-1 text-base font-bold text-gold ring-1 ring-gold/30 backdrop-blur-sm"
          >
            <Coins className="size-4" />+{reward.gold} Gold
          </motion.div>
          <motion.div
            key="attr"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: [0, 1, 1, 0], y: [18, -2, -10, -22] }}
            transition={{ duration: 1.9, delay: 0.5, times: [0, 0.15, 0.7, 1] }}
            className="rounded-full bg-primary/10 px-3.5 py-1 text-sm font-bold uppercase tracking-wider ring-1 ring-primary/30 backdrop-blur-sm"
            style={{ color: `var(--attr-${reward.attr})` }}
          >
            +{reward.attrGain} {reward.attr}
          </motion.div>
          <motion.div
            key="token"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 1, 0] }}
            transition={{ duration: 2.2, delay: 0.9, times: [0, 0.15, 0.65, 0.85, 1] }}
            className="mt-1 text-center"
          >
            <div className="text-xs text-muted-foreground">A small token for showing up.</div>
            <div className="text-xs font-semibold text-foreground/80">The real progress is yours.</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
