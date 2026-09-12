import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Crown, Flame, Medal, Trophy, TrendingUp } from "lucide-react";
import GameShell from "@/components/GameShell";

interface Row {
  characterId: string;
  name: string;
  level: number;
  xp: number;
  weeklyXp: number;
  streak: number;
  title: string;
  rank: number;
  isMine: boolean;
}

interface Board {
  lifetime: Row[];
  weekly: Row[];
  myRank: number | null;
  myXp: number | null;
  myWeeklyXp: number | null;
  nextRankXp: number | null;
  total: number;
}

export default function Leaderboard() {
  const [range, setRange] = useState<"weekly" | "lifetime">("lifetime");
  const board = useQuery(api.leaderboard.getLeaderboard) as Board | null | undefined;

  const rows = board ? (range === "weekly" ? board.weekly : board.lifetime) : [];
  const myScore = range === "weekly" ? board?.myWeeklyXp : board?.myXp;
  const gap = board?.nextRankXp != null && myScore != null ? board.nextRankXp - myScore : null;

  return (
    <GameShell>
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 text-center">
          <Trophy className="mx-auto mb-2 size-8 text-gold" />
          <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Leaderboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Heroes ranked by real-world effort</p>
        </div>

        {/* tabs */}
        <div className="ring-edge mx-auto mb-5 flex w-fit rounded-xl bg-secondary/40 p-1">
          {(["lifetime", "weekly"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg px-5 py-2 text-sm font-bold capitalize transition-all ${
                range === r ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={range === r}
            >
              {r}
            </button>
          ))}
        </div>

        {!board ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="surface-panel ring-edge h-14 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* motivating next-rank message */}
            {board.myRank !== null && gap !== null && gap > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="surface-hero ring-edge mb-5 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-center"
              >
                <TrendingUp className="size-4 shrink-0 text-primary" />
                <p className="text-sm">
                  <span className="font-bold text-gold">{gap.toLocaleString()} XP</span>
                  <span className="text-muted-foreground"> from rank </span>
                  <span className="font-bold">#{board.myRank - 1}</span>
                  <span className="text-muted-foreground"> — one hard quest closes it.</span>
                </p>
              </motion.div>
            )}
            {board.myRank === 1 && (
              <div className="surface-hero ring-edge mb-5 rounded-xl px-4 py-3 text-center">
                <p className="text-sm">
                  <span className="font-display font-black text-gradient-gold">You lead the board.</span>
                  <span className="text-muted-foreground"> Defend it tomorrow.</span>
                </p>
              </div>
            )}

            <ol className="space-y-2">
              {rows.map((r, i) => {
                const score = range === "weekly" ? r.weeklyXp : r.xp;
                return (
                  <motion.li
                    key={r.characterId}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.35 }}
                    className={`surface-quest ring-edge flex items-center gap-3 rounded-xl px-4 py-3 ${
                      r.isMine ? "glow-violet ring-1 ring-primary/40" : ""
                    }`}
                  >
                    <span className="font-display w-8 shrink-0 text-center text-lg font-black">
                      {r.rank === 1 ? (
                        <Crown className="mx-auto size-5 text-gold" />
                      ) : r.rank === 2 ? (
                        <Medal className="mx-auto size-5 text-slate-300" />
                      ) : r.rank === 3 ? (
                        <Medal className="mx-auto size-5 text-amber-700" />
                      ) : (
                        <span className="text-muted-foreground">{r.rank}</span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-sm font-semibold ${r.isMine ? "text-primary" : ""}`}>
                        {r.name}
                        {r.isMine && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest">You</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>LV {r.level}</span>
                        <span>·</span>
                        <span>{r.title}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          <Flame className="size-3 text-gold" />
                          {r.streak}d
                        </span>
                      </div>
                    </div>
                    <div className="text-right font-mono text-sm">
                      <div className="font-bold text-gold">{score.toLocaleString()} XP</div>
                      {range === "weekly" && <div className="text-[11px] text-muted-foreground">this week</div>}
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </>
        )}
      </main>
    </GameShell>
  );
}
