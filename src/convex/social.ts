import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

type CharacterDoc = {
  _id: string;
  userId: string;
  name: string;
  displayName?: string;
  pronouns?: string;
  bio?: string;
  level: number;
  xp: number;
  streak: number;
  title: string;
  form: number;
  interests?: string[];
  focusAttrs?: string[];
  privacy?: string;
};

/** Fields safe to show on a public card. */
function publicFields(c: CharacterDoc) {
  const isPrivate = c.privacy === "private";
  return {
    key: c.userId,
    name: c.name,
    displayName: isPrivate ? undefined : c.displayName,
    pronouns: isPrivate ? undefined : c.pronouns,
    bio: isPrivate ? undefined : c.bio,
    level: c.level,
    xp: c.xp,
    streak: c.streak,
    title: c.title,
    form: c.form,
    interests: isPrivate ? [] : (c.interests ?? []),
    focusAttrs: isPrivate ? [] : (c.focusAttrs ?? []),
  };
}

async function friendKeysFor(ctx: any, userId: string): Promise<Set<string>> {
  const sent = await ctx.db
    .query("friendRequests")
    .withIndex("by_from", (q: any) => q.eq("fromUserId", userId).eq("status", "accepted"))
    .collect();
  const received = await ctx.db
    .query("friendRequests")
    .withIndex("by_to", (q: any) => q.eq("toUserId", userId).eq("status", "accepted"))
    .collect();
  return new Set([...sent.map((r: any) => r.toUserId), ...received.map((r: any) => r.fromUserId)]);
}

/** Explore roster — heroes with public (or friend-visible to friends) profiles. */
export const getExploreRoster = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUserId(ctx);
    const chars = (await ctx.db.query("characters").collect()) as unknown as CharacterDoc[];
    const friendKeys = me ? await friendKeysFor(ctx, me) : new Set<string>();

    const visible = chars.filter((c) => {
      if (me && c.userId === me) return false; // your own card lives on your profile
      const p = c.privacy ?? "public";
      if (p === "private") return false;
      if (p === "friends") return me ? friendKeys.has(c.userId) : false;
      return true;
    });

    const heroes = visible
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 24)
      .map(publicFields);

    return { heroes };
  },
});

/** Public profile view. Respects privacy; friends-only content requires an accepted request. */
export const getPublicProfile = query({
  args: { userKey: v.string() },
  handler: async (ctx, { userKey }) => {
    const me = await getAuthUserId(ctx);
    const chars = (await ctx.db.query("characters").collect()) as unknown as CharacterDoc[];
    const target = chars.find((c) => c.userId === userKey);
    if (!target) return null;

    const isMe = me === userKey;
    const p = target.privacy ?? "public";
    let friendship: "none" | "pending" | "friends" = "none";

    if (me && !isMe) {
      const rel = await ctx.db
        .query("friendRequests")
        .filter((q) =>
          q.or(
            q.and(q.eq(q.field("fromUserId"), me), q.eq(q.field("toUserId"), target.userId)),
            q.and(q.eq(q.field("fromUserId"), target.userId), q.eq(q.field("toUserId"), me)),
          ),
        )
        .collect();
      const accepted = rel.find((r) => r.status === "accepted");
      const pending = rel.find((r) => r.status === "pending");
      if (accepted) friendship = "friends";
      else if (pending) friendship = "pending";
    }

    const canSeeDetails = isMe || p === "public" || (p === "friends" && friendship === "friends");

    return {
      isMe,
      friendship,
      privacy: p,
      profile: canSeeDetails
        ? publicFields(target)
        : { key: target.userId, name: target.name, level: target.level, streak: target.streak, title: target.title, form: target.form, xp: target.xp },
    };
  },
});

/** Send a friend request. Self-requests and duplicates are rejected. */
export const sendFriendRequest = mutation({
  args: { toUserKey: v.string() },
  handler: async (ctx, { toUserKey }) => {
    const me = await getAuthUserId(ctx);
    if (!me) throw new Error("Not authenticated");
    if (me === toUserKey) throw new Error("You cannot befriend yourself");

    const target = await ctx.db
      .query("characters")
      .filter((q) => q.eq(q.field("userId"), toUserKey))
      .first();
    if (!target) throw new Error("Hero not found");

    const existing = await ctx.db
      .query("friendRequests")
      .filter((q) =>
        q.or(
          q.and(q.eq(q.field("fromUserId"), me), q.eq(q.field("toUserId"), toUserKey)),
          q.and(q.eq(q.field("fromUserId"), toUserKey), q.eq(q.field("toUserId"), me)),
        ),
      )
      .first();
    if (existing) {
      if (existing.status === "accepted") throw new Error("You are already friends");
      if (existing.fromUserId === toUserKey) {
        // they already asked you — accept it instead
        await ctx.db.patch(existing._id, { status: "accepted", respondedAt: Date.now() });
        return { ok: true, accepted: true };
      }
      throw new Error("Request already pending");
    }

    await ctx.db.insert("friendRequests", {
      fromUserId: me as never,
      toUserId: toUserKey as never,
      status: "pending",
      createdAt: Date.now(),
    });
    return { ok: true, accepted: false };
  },
});

/** Accept or decline a pending request addressed to me. */
export const respondToFriendRequest = mutation({
  args: { requestId: v.id("friendRequests"), accept: v.boolean() },
  handler: async (ctx, { requestId, accept }) => {
    const me = await getAuthUserId(ctx);
    if (!me) throw new Error("Not authenticated");
    const req = await ctx.db.get(requestId);
    if (!req) throw new Error("Request not found");
    if (req.toUserId !== me) throw new Error("Not your request");
    if (req.status !== "pending") throw new Error("Request already handled");

    await ctx.db.patch(requestId, {
      status: accept ? "accepted" : "declined",
      respondedAt: Date.now(),
    });
    return { ok: true };
  },
});

/** Incoming pending requests with sender names. */
export const listMyFriendRequests = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUserId(ctx);
    if (!me) return [];
    const rows = await ctx.db
      .query("friendRequests")
      .withIndex("by_to", (q) => q.eq("toUserId", me).eq("status", "pending"))
      .collect();
    const out = [];
    for (const r of rows) {
      const sender = await ctx.db
        .query("characters")
        .filter((q) => q.eq(q.field("userId"), r.fromUserId))
        .first();
      if (sender) {
        out.push({
          requestId: r._id,
          fromKey: r.fromUserId,
          name: sender.name,
          level: sender.level,
          title: sender.title,
          createdAt: r.createdAt,
        });
      }
    }
    return out;
  },
});

/** Accepted friends with live progression. */
export const listMyFriends = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUserId(ctx);
    if (!me) return [];
    const keys = await friendKeysFor(ctx, me);
    const out = [];
    for (const key of keys) {
      const c = await ctx.db
        .query("characters")
        .filter((q) => q.eq(q.field("userId"), key))
        .first();
      if (c) out.push(publicFields(c as unknown as CharacterDoc));
    }
    return out.sort((a, b) => b.level - a.level || b.xp - a.xp);
  },
});
