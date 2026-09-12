import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { titleForLevel } from "./gameRules";

/** Global leaderboard: top 10 characters by total XP + my rank. */
export const getLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const myUserId = await getAuthUserId(ctx);
    const all = await ctx.db.query("characters").collect();

    // join with users to derive display names
    const rows = [];
    for (const char of all) {
      const user = await ctx.db.get(char.userId);
      const rawName = user?.name || user?.email?.split("@")[0] || char.name;
      const isGuest = !!user?.isAnonymous;
      rows.push({
        characterId: char._id,
        name: isGuest ? `${char.name}` : rawName || char.name,
        level: char.level,
        xp: char.xp,
        gold: char.gold,
        streak: char.streak,
        title: char.title,
        isMine: myUserId !== null && char.userId === myUserId,
      });
    }

    rows.sort((a, b) => b.xp - a.xp);
    const top = rows.slice(0, 10).map((r, i) => ({ ...r, rank: i + 1 }));
    const mine = rows.findIndex((r) => r.isMine);
    return {
      top,
      myRank: mine >= 0 ? mine + 1 : null,
      total: rows.length,
    };
  },
});

export { titleForLevel };