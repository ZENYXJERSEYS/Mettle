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
    })
    .index("by_quest", ["questId"])
    .index("by_user", ["userId"]),

    activityLog: defineTable({
      userId: v.id("users"),
      kind: v.string(), // quest_created | quest_completed | level_up | milestone
      message: v.string(),
      icon: v.string(), // lucide icon name
      xp: v.optional(v.number()),
      gold: v.optional(v.number()),
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
      key: v.string(), // stable catalog key, e.g. "ember_halo"
      name: v.string(),
      description: v.string(),
      price: v.number(),
      rarity: v.string(), // common | rare | epic | legendary
      tint: v.string(), // hex color applied to the 3D hero
      icon: v.string(), // lucide icon name
    }).index("by_key", ["key"]),

    // One row per owned item per user
    inventory: defineTable({
      userId: v.id("users"),
      itemKey: v.string(),
      equipped: v.boolean(),
      purchasedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_item", ["userId", "itemKey"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;