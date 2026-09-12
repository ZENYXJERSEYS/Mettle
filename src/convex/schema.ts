import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not real
      image: v.optional(v.string()), // image of the user. do not real
      email: v.optional(v.string()), // email of the user. do not real
      emailVerificationTime: v.optional(v.number()), // email verification time. do not real
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not real

      role: v.optional(roleValidator), // role of the user. do not real
    }).index("email", ["email"]), // index for the email. do not remove or modify

    characters: defineTable({
      userId: v.id("users"),
      name: v.string(),
      title: v.string(),
      level: v.number(),
      xp: v.number(), // total accumulated XP (source of truth)
      gold: v.number(),
      strength: v.number(),
      intellect: v.number(),
      wisdom: v.number(),
      discipline: v.number(),
      vitality: v.number(),
      creativity: v.number(),
      streak: v.number(),
      lastCompletionDay: v.optional(v.string()), // "YYYY-MM-DD" in UTC
      form: v.number(), // crystal form tier (1-4), derived visually from level
      // profile / onboarding
      displayName: v.optional(v.string()),
      pronouns: v.optional(v.string()),
      bio: v.optional(v.string()), // max 160 chars
      interests: v.optional(v.array(v.string())),
      focusAttrs: v.optional(v.array(v.string())), // 1-3 of ATTRS
      motivations: v.optional(v.array(v.string())),
      timezone: v.optional(v.string()),
      onboardingComplete: v.optional(v.boolean()),
      longestStreak: v.optional(v.number()),
      privacy: v.optional(v.string()), // public | friends | private (profile+activity)
    })
      .index("by_user", ["userId"])
      .index("by_level", ["level"]),

    quests: defineTable({
      userId: v.id("users"),
      title: v.string(),
      category: v.string(), // intellect | strength | vitality | wisdom | discipline | creativity
      difficulty: v.string(), // easy | medium | hard | epic
      status: v.string(), // active | completed
      xpReward: v.number(),
      goldReward: v.number(),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
      dayKey: v.optional(v.string()), // UTC day the quest was created for
    })
      .index("by_user", ["userId"])
      .index("by_user_status", ["userId", "status"])
      .index("by_user_day", ["userId", "dayKey"])
      .index("by_user_status_day", ["userId", "status", "dayKey"]),

    questCompletions: defineTable({
      userId: v.id("users"),
      questId: v.id("quests"),
      title: v.string(),
      category: v.string(),
      difficulty: v.string(),
      xp: v.number(),
      gold: v.number(),
      attr: v.string(),
      attrGain: v.number(),
      dayKey: v.string(),
      completedAt: v.number(),
      // truthful-completion system
      honest: v.optional(v.boolean()), // did the user confirm genuine completion
      reflection: v.optional(v.string()), // one honest sentence, saved by the user
      reflectedAt: v.optional(v.number()),
    })
    .index("by_quest", ["questId"])
    .index("by_user", ["userId"]),

    activityLog: defineTable({
      userId: v.id("users"),
      kind: v.string(), // quest_created | quest_completed | level_up | milestone | purchase
      message: v.string(),
      icon: v.string(), // lucide icon name
      xp: v.optional(v.number()),
      gold: v.optional(v.number()),
      completionId: v.optional(v.id("questCompletions")), // links honest completions to reflections
      reflection: v.optional(v.string()), // one honest sentence, added after the fact
      dayKey: v.string(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_created", ["userId", "createdAt"]),

    attributesHistory: defineTable({
      userId: v.id("users"),
      attr: v.string(),
      gain: v.number(),
      dayKey: v.string(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_attr", ["userId", "attr"]),

    // Shop catalog — seeded once, idempotent
    shopItems: defineTable({
      key: v.string(), // stable catalog key, e.g. "astral_mantle"
      name: v.string(),
      description: v.string(),
      price: v.number(),
      rarity: v.string(), // common | uncommon | rare | epic | legendary | mythic
      category: v.string(), // aura | core | skin | frame | title | badge | background | effect
      tint: v.string(), // hex color applied to the 3D hero / UI chrome
      icon: v.string(), // lucide icon name
      materialType: v.optional(v.string()), // matte | energy | glass | metal | crystal | cosmic
      isUnique: v.optional(v.boolean()),
      featured: v.optional(v.boolean()),
      titleGrant: v.optional(v.string()), // display title granted when equipped
    }).index("by_key", ["key"]),

    // One row per owned item per user
    inventory: defineTable({
      userId: v.id("users"),
      itemKey: v.string(),
      equipped: v.boolean(),
      acquiredAt: v.number(), // renamed from purchasedAt
    })
      .index("by_user", ["userId"])
      .index("by_user_item", ["userId", "itemKey"]),

    // Immutable purchase receipts
    purchaseTransactions: defineTable({
      userId: v.id("users"),
      itemKey: v.string(),
      pricePaid: v.number(),
      purchasedAt: v.number(),
    }).index("by_user", ["userId"]),

    // Profile settings — one row per user, created lazily
    userSettings: defineTable({
      userId: v.id("users"),
      truthfulMode: v.boolean(), // truthfulness prompt on completion; default true
    }).index("by_user", ["userId"]),

    // Friend requests — status: pending | accepted | declined
    friendRequests: defineTable({
      fromUserId: v.id("users"),
      toUserId: v.id("users"),
      status: v.string(),
      createdAt: v.number(),
      respondedAt: v.optional(v.number()),
    })
      .index("by_to", ["toUserId", "status"])
      .index("by_from", ["fromUserId", "status"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;