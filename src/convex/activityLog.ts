import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";

/** Recent activity entries for the Adventure Log. */
export const listMyActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const rows = await ctx.db
      .query("activityLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const capped = Math.min(Math.max(1, limit ?? 30), 100);
    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, capped);
  },
});
