import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import {
  ATTRS,
  formForLevel,
  levelFromXp,
  levelUpReward,
  nextStreak,
  titleForLevel,
} from "./gameRules";

const DEFAULT_NAME = "Wanderer";

export interface LevelUpInfo {
  level: number;
  gold: number;
  attrPoints: number;
  title?: string;
}
export interface CreditResult {
  characterId: string;
  xp: number;
  level: number;
  gold: number;
  leveledUp: boolean;
  levelUps: LevelUpInfo[];
  form: number;
  formChanged: boolean;
  streak: number;
}

/** Get (or lazily create) the signed-in user's character. */
export const getMyCharacter = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const char = await ctx.db
      .query("characters")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (char) return char;
    return null;
  },
});

/** Create the character on demand (called from the dashboard when missing). */
export const createCharacter = mutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("characters")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) return existing._id;
    const rawName = (args.name ?? "").trim();
    const name = rawName.slice(0, 20) || DEFAULT_NAME;
    const now = Date.now();
    return await ctx.db.insert("characters", {
      userId,
      name,
      title: titleForLevel(1),
      level: 1,
      xp: 0,
      gold: 40,
      strength: 5,
      intellect: 5,
      wisdom: 5,
      discipline: 5,
      vitality: 5,
      creativity: 5,
      streak: 0,
      form: 1,
    });
  },
});

/** Internal: credit XP/Gold/attributes, handle multi-level-ups, return authoritative diff. */
export const creditRewards = internalMutation({
  args: {
    userId: v.id("users"),
    xp: v.number(),
    gold: v.number(),
    attr: v.string(),
    attrGain: v.number(),
    dayKey: v.string(),
  },
  handler: async (ctx, args): Promise<CreditResult> => {
    const char = await ctx.db
      .query("characters")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (!char) throw new Error("Character not found");

    const newXp = char.xp + args.xp;
    const lvl = levelFromXp(newXp);
    const newLevel = lvl.level;
    const leveledUp = newLevel > char.level;
    const oldForm = char.form;
    const newForm = formForLevel(newLevel);

    const patch: Record<string, number | string> = {
      xp: newXp,
      level: newLevel,
      form: newForm,
      gold: Math.max(0, char.gold + args.gold),
    };

    if ((ATTRS as readonly string[]).includes(args.attr)) {
      const current = (char as unknown as Record<string, number>)[args.attr] ?? 0;
      (patch as Record<string, number>)[args.attr] = current + args.attrGain;
    }

    // Streak update
    const streak = nextStreak(char.streak, char.lastCompletionDay, args.dayKey);
    patch.streak = streak;
    patch.lastCompletionDay = args.dayKey;

    // Title update
    if (leveledUp) patch.title = titleForLevel(newLevel);

    await ctx.db.patch(char._id, patch);

    // Level-up rewards + activity log entries
    const levelUps: LevelUpInfo[] = [];
    let bonusGold = 0;
    if (leveledUp) {
      for (let l = char.level + 1; l <= newLevel; l++) {
        const reward = levelUpReward(l);
        bonusGold += reward.gold;
        levelUps.push({ level: l, gold: reward.gold, attrPoints: reward.attrPoints, title: reward.title });
      }
      await ctx.db.patch(char._id, { gold: (patch.gold as number) + bonusGold });
    }

    return {
      characterId: char._id,
      xp: newXp,
      level: newLevel,
      gold: (patch.gold as number) + bonusGold,
      leveledUp,
      levelUps,
      form: newForm,
      formChanged: newForm !== oldForm,
      streak,
    };
  },
});

/** DEV ONLY — grant XP directly for demo/testing level-up flow. */
export const grantXp = mutation({
  args: { amount: v.number() },
  handler: async (ctx, { amount }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const amt = Math.floor(amount);
    if (!Number.isFinite(amt) || amt <= 0 || amt > 2000) {
      throw new Error("Amount must be between 1 and 2000");
    }
    const char = await ctx.db
      .query("characters")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!char) throw new Error("Character not found");
    const newXp = char.xp + amt;
    const newLevel = levelFromXp(newXp).level;
    const leveledUp = newLevel > char.level;
    await ctx.db.patch(char._id, {
      xp: newXp,
      level: newLevel,
      form: formForLevel(newLevel),
      title: leveledUp ? titleForLevel(newLevel) : char.title,
    });
    if (leveledUp) {
      const reward = levelUpReward(newLevel);
      await ctx.db.patch(char._id, { gold: char.gold + reward.gold });
      await ctx.db.insert("activityLog", {
        userId,
        kind: "level_up",
        message: `Reached level ${newLevel}`,
        icon: "Trophy",
        gold: reward.gold,
        dayKey: new Date().toISOString().slice(0, 10),
        createdAt: Date.now(),
      });
    }
    return {
      ok: true,
      leveledUp,
      levelUp: leveledUp
        ? { newLevel, gold: levelUpReward(newLevel).gold, attrPoints: 1 }
        : null,
    };
  },
});