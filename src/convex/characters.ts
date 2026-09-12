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

// Distinct hero names so the leaderboard never fills with duplicate Wanderers.
const NAME_POOL = [
  "Auren", "Kael", "Seraphel", "Dren", "Lyra", "Thane", "Vesper", "Ilyra",
  "Marek", "Solenne", "Orrin", "Nyx", "Calder", "Elara", "Rune", "Sable",
  "Talon", "Wren", "Zephyr", "Isolde", "Kairo", "Meris", "Fenn", "Astra",
];

/** Deterministic pick from the pool — different users get different default names. */
function defaultNameFor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return NAME_POOL[Math.abs(hash) % NAME_POOL.length];
}

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

/** Sanitize user text: trim, cap length, strip angle brackets to prevent injection. */
function clean(input: string, max: number): string {
  return input
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, max);
}

/** Create the character on demand (called from onboarding when missing). */
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
    const name = rawName.slice(0, 20) || defaultNameFor(userId);
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

/** Persist onboarding profile + mark complete. Called once at the end of the wizard. */
export const finalizeOnboarding = mutation({
  args: {
    characterName: v.string(),
    displayName: v.optional(v.string()),
    pronouns: v.optional(v.string()),
    bio: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    focusAttrs: v.optional(v.array(v.string())),
    motivations: v.optional(v.array(v.string())),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const char = await ctx.db
      .query("characters")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!char) throw new Error("Create your character first");

    const name = clean(args.characterName, 24);
    if (name.length < 2) throw new Error("Character name must be at least 2 characters.");

    await ctx.db.patch(char._id, {
      name,
      displayName: args.displayName ? clean(args.displayName, 32) : undefined,
      pronouns: args.pronouns ? clean(args.pronouns, 24) : undefined,
      bio: args.bio ? clean(args.bio, 160) : undefined,
      interests: (args.interests ?? []).slice(0, 12).map((i) => clean(i, 24)),
      focusAttrs: (args.focusAttrs ?? [])
        .filter((a) => (ATTRS as readonly string[]).includes(a))
        .slice(0, 3),
      motivations: (args.motivations ?? []).slice(0, 8).map((m) => clean(m, 32)),
      timezone: args.timezone ? clean(args.timezone, 64) : undefined,
      onboardingComplete: true,
      privacy: char.privacy ?? "public",
    });
    return { ok: true };
  },
});

/** Editable profile fields (privacy controls included). */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    displayName: v.optional(v.string()),
    pronouns: v.optional(v.string()),
    bio: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    focusAttrs: v.optional(v.array(v.string())),
    privacy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const char = await ctx.db
      .query("characters")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!char) throw new Error("Character not found");

    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) {
      const name = clean(args.name, 24);
      if (name.length < 2) throw new Error("Character name must be at least 2 characters.");
      patch.name = name;
    }
    if (args.displayName !== undefined)
      patch.displayName = args.displayName ? clean(args.displayName, 32) : undefined;
    if (args.pronouns !== undefined)
      patch.pronouns = args.pronouns ? clean(args.pronouns, 24) : undefined;
    if (args.bio !== undefined) patch.bio = args.bio ? clean(args.bio, 160) : undefined;
    if (args.interests !== undefined)
      patch.interests = args.interests.slice(0, 12).map((i) => clean(i, 24));
    if (args.focusAttrs !== undefined)
      patch.focusAttrs = args.focusAttrs
        .filter((a) => (ATTRS as readonly string[]).includes(a))
        .slice(0, 3);
    if (args.privacy !== undefined) {
      if (!["public", "friends", "private"].includes(args.privacy))
        throw new Error("Invalid privacy setting.");
      patch.privacy = args.privacy;
    }
    if (Object.keys(patch).length > 0) await ctx.db.patch(char._id, patch);
    return { ok: true };
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