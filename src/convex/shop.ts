import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";

const CATALOG = [
  { key: "ember_halo", name: "Ember Halo", description: "A ring of warm firelight for your crystal.", price: 60, rarity: "common", tint: "#fb923c", icon: "Flame" },
  { key: "frost_sigil", name: "Frost Sigil", description: "Cold blue light. Calm and precise.", price: 90, rarity: "rare", tint: "#7dd3fc", icon: "Snowflake" },
  { key: "verdant_heart", name: "Verdant Heart", description: "Life-green energy that hums softly.", price: 140, rarity: "rare", tint: "#4ade80", icon: "Leaf" },
  { key: "arc_crown", name: "Arc Crown", description: "Electric violet with an unstable edge.", price: 220, rarity: "epic", tint: "#a78bfa", icon: "Zap" },
  { key: "solar_core", name: "Solar Core", description: "Molten gold. The crystal burns bright.", price: 320, rarity: "legendary", tint: "#fbbf24", icon: "Sun" },
] as const;

/** Internal: idempotent catalog seed, callable from actions or client via wrapper. */
export const seedCatalogInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const item of CATALOG) {
      const existing = await ctx.db
        .query("shopItems")
        .withIndex("by_key", (q) => q.eq("key", item.key))
        .first();
      if (!existing) await ctx.db.insert("shopItems", { ...item });
    }
    return { ok: true };
  },
});

/** Public wrapper: ensures the catalog is seeded before listing. */
export const ensureCatalog = mutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("shopItems").collect();
    if (items.length === 0) {
      await ctx.runMutation(internal.shop.seedCatalogInternal, {});
    }
    return { ok: true };
  },
});

/** Catalog + ownership state for the caller. */
export const listShop = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const items = await ctx.db.query("shopItems").collect();
    const owned = await ctx.db
      .query("inventory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const ownedSet = new Set(owned.map((o) => o.itemKey));
    const equipped = owned.find((o) => o.equipped);
    return {
      items: items.map(({ _id, _creationTime, ...rest }) => rest),
      owned: ownedSet,
      equippedKey: equipped?.itemKey ?? null,
    };
  },
});

/** Get the caller's equipped item tint (for the 3D hero). */
export const getMyEquipped = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const owned = await ctx.db
      .query("inventory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const equipped = owned.find((o) => o.equipped);
    if (!equipped) return null;
    const item = await ctx.db
      .query("shopItems")
      .withIndex("by_key", (q) => q.eq("key", equipped.itemKey))
      .first();
    return item ? { key: item.key, name: item.name, tint: item.tint, rarity: item.rarity } : null;
  },
});

/** Transactional purchase: verify item, price, funds; deduct gold; grant ownership. */
export const purchaseItem = mutation({
  args: { itemKey: v.string() },
  handler: async (ctx, { itemKey }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const item = await ctx.db
      .query("shopItems")
      .withIndex("by_key", (q) => q.eq("key", itemKey))
      .first();
    if (!item) throw new Error("Item not found");

    const existing = await ctx.db
      .query("inventory")
      .withIndex("by_user_item", (q) => q.eq("userId", userId).eq("itemKey", itemKey))
      .first();
    if (existing) throw new Error("You already own this item");

    const char = await ctx.db
      .query("characters")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!char) throw new Error("Create your character first");
    if (char.gold < item.price) {
      throw new Error(`Not enough Gold — need ${item.price - char.gold} more`);
    }

    // Atomic: deduct + grant ownership in one transaction
    await ctx.db.patch(char._id, { gold: char.gold - item.price });
    await ctx.db.insert("inventory", {
      userId,
      itemKey,
      equipped: false,
      purchasedAt: Date.now(),
    });
    await ctx.db.insert("activityLog", {
      userId,
      kind: "purchase",
      message: `Purchased ${item.name}`,
      icon: item.icon,
      gold: -item.price,
      dayKey: new Date().toISOString().slice(0, 10),
      createdAt: Date.now(),
    });

    return { ok: true, goldLeft: char.gold - item.price };
  },
});

/** Equip / unequip. Only one item equipped at a time. */
export const setEquipped = mutation({
  args: { itemKey: v.optional(v.string()) },
  handler: async (ctx, { itemKey }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const owned = await ctx.db
      .query("inventory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // unequip everything
    for (const row of owned) {
      if (row.equipped) await ctx.db.patch(row._id, { equipped: false });
    }
    if (itemKey) {
      const target = owned.find((o) => o.itemKey === itemKey);
      if (!target) throw new Error("You don't own that item");
      await ctx.db.patch(target._id, { equipped: true });
    }
    return { ok: true, equippedKey: itemKey ?? null };
  },
});

/** My inventory rows joined with item details. */
export const listMyInventory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const owned = await ctx.db
      .query("inventory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const out = [];
    for (const row of owned) {
      const item = await ctx.db
        .query("shopItems")
        .withIndex("by_key", (q) => q.eq("key", row.itemKey))
        .first();
      if (item) {
        out.push({
          _id: row._id,
          itemKey: row.itemKey,
          equipped: row.equipped,
          name: item.name,
          description: item.description,
          rarity: item.rarity,
          tint: item.tint,
          icon: item.icon,
          price: item.price,
        });
      }
    }
    return out.sort((a, b) => Number(b.equipped) - Number(a.equipped));
  },
});
