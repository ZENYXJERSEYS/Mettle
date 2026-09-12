import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

const DAY_MS = 86400000;

interface Row {
  characterId: string;
  name: string;
  level: number;
  xp: number;
  weeklyXp: number;
  streak: number;
  title: string;
  isMine: boolean;
  rank: number;
}

/** Distinct display name for a character (avoids rows of identical "Wanderer"s). */
function distinctName(
  rawName: string,
  charName: string,
  idx: number,
  isGuest: boolean,
): string {
  const base = (rawName || charName || "Wanderer").trim();
  const cleaned = base.replace(/\s+/g, " ").slice(0, 18);
  if (isGuest) {
    // guests get a codename-style suffix so the board doesn't fill with clones
    return `${cleaned}-${String(idx + 1).padStart(2, "0")}`;
  }
  return cleaned || `Wanderer-${String(idx + 1).padStart(2, "0")}`;
}

/** Leaderboard: returns lifetime (total XP) and weekly (7d XP) rankings + my gap to next rank. */
export const getLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const myUserId = await getAuthUserId(ctx);
    const all = await ctx.db.query("characters").collect();

    const since = Date.now() - 7 * DAY_MS;

    // aggregate weekly XP from questCompletions in one pass
    const completions = await ctx.db.query("questCompletions").collect();
    const weeklyByUser = new Map<string, number>();
    for (const c of completions) {
      if (c.completedAt >= since) {
        weeklyByUser.set(c.userId, (weeklyByUser.get(c.userId) ?? 0) + c.xp);
      }
    }

    const rows: Omit<Row, "rank">[] = [];
    let idx = 0;
    for (const char of all) {
      const user = await ctx.db.get(char.userId);
      const rawName = user?.name || user?.email?.split("@")[0] || char.name;
      rows.push({
        characterId: char._id,
        name: distinctName(rawName, char.name, idx++, !!user?.isAnonymous),
        level: char.level,
        xp: char.xp,
        weeklyXp: weeklyByUser.get(char.userId) ?? 0,
        streak: char.streak,
        title: char.title,
        isMine: myUserId !== null && char.userId === myUserId,
      });
    }

    const rankBy = <T extends { xp: number; weeklyXp: number }>(list: T[], key: "xp" | "weeklyXp") =>
      [...list]
        .sort((a, b) => b[key] - a[key])
        .map((r, i) => ({ ...r, rank: i + 1 }));

    const lifetime = rankBy(rows, "xp");
    const weekly = rankBy(rows, "weeklyXp");

    const mineLifetime = lifetime.find((r) => r.isMine);
    const myRank = mineLifetime?.rank ?? null;
    const ahead = myRank && myRank > 1 ? lifetime[myRank - 2] : undefined;

    return {
      lifetime: lifetime.slice(0, 10),
      weekly: weekly.slice(0, 10),
      myRank,
      myXp: mineLifetime?.xp ?? null,
      myWeeklyXp: mineLifetime?.weeklyXp ?? null,
      nextRankXp: ahead?.xp ?? null,
      total: rows.length,
    };
  },
});
