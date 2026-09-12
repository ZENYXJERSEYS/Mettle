import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import {
  CATEGORY_TO_ATTR,
  DIFFICULTY_META,
  dayKeyFromTimestamp,
  validateQuestInput,
  validateReflection,
} from "./gameRules";

/** All my quests, active first. */
export const listMyQuests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const all = await ctx.db
      .query("quests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return all.sort((a, b) => {
      if (a.status !== b.status) return a.status === "active" ? -1 : 1;
      return b.createdAt - a.createdAt;
    });
  },
});

export const createQuest = mutation({
  args: {
    title: v.string(),
    category: v.string(),
    difficulty: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const vres = validateQuestInput(args);
    if (!vres.ok) throw new Error(vres.error);
    const meta = DIFFICULTY_META[args.difficulty as keyof typeof DIFFICULTY_META];

    const now = Date.now();
    const questId = await ctx.db.insert("quests", {
      userId,
      title: vres.title,
      category: args.category,
      difficulty: args.difficulty,
      status: "active",
      xpReward: meta.xp,
      goldReward: meta.gold,
      createdAt: now,
      dayKey: dayKeyFromTimestamp(now),
    });

    await ctx.db.insert("activityLog", {
      userId,
      kind: "quest_created",
      message: `Accepted quest: ${vres.title}`,
      icon: "PlusCircle",
      dayKey: dayKeyFromTimestamp(now),
      createdAt: now,
    });

    return questId;
  },
});

export const updateQuest = mutation({
  args: {
    questId: v.id("quests"),
    title: v.optional(v.string()),
    category: v.optional(v.string()),
    difficulty: v.optional(v.string()),
  },
  handler: async (ctx, { questId, title, category, difficulty }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const quest = await ctx.db.get(questId);
    if (!quest) throw new Error("Quest not found");
    if (quest.userId !== userId) throw new Error("Not your quest");
    if (quest.status === "completed") throw new Error("Completed quests can't be edited");

    const patch: Partial<{ title: string; category: string; difficulty: string; xpReward: number; goldReward: number }> = {};
    if (title !== undefined) {
      const vres = validateQuestInput({ title, category: category ?? quest.category, difficulty: difficulty ?? quest.difficulty });
      if (!vres.ok) throw new Error(vres.error);
      patch.title = vres.title;
    }
    if (category !== undefined) {
      if (!CATEGORY_TO_ATTR[category]) throw new Error("Unknown quest category.");
      patch.category = category;
    }
    if (difficulty !== undefined) {
      if (!(difficulty in DIFFICULTY_META)) throw new Error("Unknown quest difficulty.");
      patch.difficulty = difficulty;
      const meta = DIFFICULTY_META[difficulty as keyof typeof DIFFICULTY_META];
      patch.xpReward = meta.xp;
      patch.goldReward = meta.gold;
    }

    await ctx.db.patch(questId, patch);
    return { ok: true };
  },
});

export const deleteQuest = mutation({
  args: { questId: v.id("quests") },
  handler: async (ctx, { questId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const quest = await ctx.db.get(questId);
    if (!quest) return { ok: true };
    if (quest.userId !== userId) throw new Error("Not your quest");

    await ctx.db.delete(questId);
    return { ok: true };
  },
});

/** Atomic quest completion — ownership, eligibility, rewards, streak, log, dedupe. */
interface CompleteQuestResult {
  alreadyCompleted: boolean;
  questId: string;
  completionId?: string;
  reward?: { xp: number; gold: number; attr: string; attrGain: number };
  levelUp?: { newLevel: number; gold: number; attrPoints: number; newTitle?: string } | null;
}

export const completeQuest = mutation({
  args: {
    questId: v.id("quests"),
    honest: v.optional(v.boolean()), // from the truthful-completion prompt
  },
  handler: async (ctx, { questId, honest }): Promise<CompleteQuestResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // 1. Retrieve quest (Convex transactions are serialized — no lost updates)
    const quest = await ctx.db.get(questId);
    if (!quest) throw new Error("Quest not found");

    // 2. Ownership check
    if (quest.userId !== userId) throw new Error("Not your quest");

    // 3. Idempotency / duplicate-completion protection
    if (quest.status === "completed") {
      const prior = await ctx.db
        .query("questCompletions")
        .withIndex("by_quest", (q) => q.eq("questId", questId))
        .first();
      const priorResult: CompleteQuestResult = {
        alreadyCompleted: true,
        questId,
        ...(prior ? { completionId: prior._id } : {}),
      };
      return priorResult;
    }

    const now = Date.now();
    const dayKey = dayKeyFromTimestamp(now);
    const meta = DIFFICULTY_META[quest.difficulty as keyof typeof DIFFICULTY_META]
      ?? DIFFICULTY_META.medium;
    const attr = CATEGORY_TO_ATTR[quest.category] ?? "discipline";

    // 4. Mark quest completed
    await ctx.db.patch(questId, {
      status: "completed",
      completedAt: now,
    });

    // 5. Record completion record (duplicate-protection anchor)
    const completionId = await ctx.db.insert("questCompletions", {
      userId,
      questId,
      title: quest.title,
      category: quest.category,
      difficulty: quest.difficulty,
      xp: meta.xp,
      gold: meta.gold,
      attr,
      attrGain: meta.attrGain,
      dayKey,
      completedAt: now,
      honest: honest !== false, // truthful by default; explicit false records an unconfirmed claim
    });

    // 6. Credit character (xp/gold/attr/streak/level) via shared internal fn
    const credit = await ctx.runMutation(internal.characters.creditRewards, {
      userId,
      xp: meta.xp,
      gold: meta.gold,
      attr,
      attrGain: meta.attrGain,
      dayKey,
    });

    // 7. Activity log — message reflects the honest report contract
    await ctx.db.insert("activityLog", {
      userId,
      kind: "quest_completed",
      message: `${honest === false ? "Completed" : "Completed honestly"}: ${quest.title}`,
      icon: "Swords",
      xp: meta.xp,
      gold: meta.gold,
      completionId,
      dayKey,
      createdAt: now + 1,
    });

    if (credit.leveledUp) {
      await ctx.db.insert("activityLog", {
        userId,
        kind: "level_up",
        message: `Reached level ${credit.level}${credit.levelUps.some((lu: { title?: string }) => lu.title) ? ` — new title earned` : ""}`,
        icon: "Trophy",
        gold: credit.levelUps.reduce((a: number, lu: { gold: number }) => a + lu.gold, 0),
        dayKey,
        createdAt: now + 2,
      });
    }

    return {
      alreadyCompleted: false,
      questId,
      completionId,
      reward: {
        xp: meta.xp,
        gold: meta.gold,
        attr,
        attrGain: meta.attrGain,
      },
      levelUp: credit.leveledUp
        ? {
            newLevel: credit.level,
            gold: credit.levelUps.reduce((a: number, lu: { gold: number }) => a + lu.gold, 0),
            attrPoints: credit.levelUps[0]?.attrPoints ?? 1,
            newTitle: credit.levelUps.map((lu: { title?: string }) => lu.title).find(Boolean),
          }
        : null,
    };
  },
});

/** Save a one-sentence reflection on an honest completion. */
export const saveReflection = mutation({
  args: {
    completionId: v.id("questCompletions"),
    text: v.string(),
  },
  handler: async (ctx, { completionId, text }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const completion = await ctx.db.get(completionId);
    if (!completion) throw new Error("Completion not found");
    if (completion.userId !== userId) throw new Error("Not your completion");
    if (completion.honest === false)
      throw new Error("Reflections are only saved for honest completions");
    if (completion.reflection)
      throw new Error("Reflection already saved for this quest.");

    const vres = validateReflection(text);
    if (!vres.ok) throw new Error(vres.error);

    await ctx.db.patch(completion._id, {
      reflection: vres.text,
      reflectedAt: Date.now(),
    });

    // mirror the reflection onto the Adventure Log entry
    const logEntry = await ctx.db
      .query("activityLog")
      .withIndex("by_user", (q) => q.eq("userId", completion.userId))
      .order("desc")
      .filter((q) => q.eq(q.field("completionId"), completion._id))
      .first();
    if (logEntry) {
      await ctx.db.patch(logEntry._id, { reflection: vres.text });
    }
    return { ok: true };
  },
});

/** DEV ONLY — uncomplete a quest (retry the demo flow safely). */
export const resetQuestForDemo = mutation({
  args: { questId: v.id("quests") },
  handler: async (ctx, { questId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const quest = await ctx.db.get(questId);
    if (!quest || quest.userId !== userId) throw new Error("Not your quest");
    // Delete completions for this quest and revert character xp
    const comps = await ctx.db
      .query("questCompletions")
      .withIndex("by_quest", (q) => q.eq("questId", questId))
      .collect();
    for (const c of comps) {
      const char = await ctx.db
        .query("characters")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      if (char) {
        await ctx.db.patch(char._id, {
          xp: Math.max(0, char.xp - c.xp),
          gold: Math.max(0, char.gold - c.gold),
        });
      }
      await ctx.db.delete(c._id);
    }
    await ctx.db.patch(questId, { status: "active", completedAt: undefined });
    return { ok: true };
  },
});
