import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** My profile settings (row created lazily; truthfulMode defaults true). */
export const getMySettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const s = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return { truthfulMode: s ? s.truthfulMode : true };
  },
});

/** Toggle Truthful Completions. */
export const setTruthfulMode = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, { enabled }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const s = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (s) {
      await ctx.db.patch(s._id, { truthfulMode: enabled });
    } else {
      await ctx.db.insert("userSettings", { userId, truthfulMode: enabled });
    }
    return { ok: true };
  },
});
