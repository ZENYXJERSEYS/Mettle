import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Crown, Medal, Trophy } from "lucide-react";
import GameShell from "@/components/GameShell";

interface Row {
  characterId: string;
  name: string;
  level: number;
  xp: number;
  streak: number;
  title: string;
  rank: number;
  isMine: boolean;
}

export default function Leaderboard() {
  const board = useQuery(api.leaderboard.getLeaderboard) as
    | { top: Row[]; myRank: number | null; total: number }
    | null
    | undefined;

  return (
    <GameShell>
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 text-center">
          <Trophy className="mx-auto mb-2 size-8 text-gold" />
          <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Leaderboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Heroes ranked by lifetime XP</p>
        </div>

        {!board ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="surface-panel ring-edge h-14 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {board.myRank !== null && (
              <div className="surface-hero ring-edge mb-5 rounded-xl px-4 py-3 text-center">
                <span className="text-sm text-muted-foreground">Your rank: </span>
                <span className="font-display text-lg font-black text-gradient-gold">
                  #{board.myRank}
                </span>
                <span className="text-sm text-muted-foreground"> of {board.total}</span>
              </div>
            )}
            <ol className="space-y-2">
              {board.top.map((r, i) => (
                <motion.li
                  key={r.characterId}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35 }}
                  className={`surface-quest ring-edge flex items-center gap-3 rounded-xl px-4 py-3 ${
                    r.isMine ? "glow-violet ring-1 ring-primary/40" : ""
                  }`}
                >
                  <span className="font-display w-8 shrink-0 text-center text-lg font-black">
                    {r.rank === 1 ? (
                      <Crown className="mx-auto size-5 text-gold" />
                    ) : r.rank <= 3 ? (
                      <Medal className={`mx-auto size-5 ${r.rank === 2 ? "text-foreground/60" : "text-amber-700"}`} />
                    ) : (
                      <span className="text-muted-foreground">{r.rank}</span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm font-semibold ${r.isMine ? "text-primary" : ""}`}>
                      {r.name}
                      {r.isMine && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest">You</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      LV {r.level} · {r.title}
                    </div>
                  </div>
                  <div className="text-right font-mono text-sm">
                    <div className="font-bold text-gold">{r.xp.toLocaleString()} XP</div>
                    <div className="text-[11px] text-muted-foreground">{r.streak}d streak</div>
                  </div>
                </motion.li>
              ))}
            </ol>
          </>
        )}
      </main>
    </GameShell>
  );
}
