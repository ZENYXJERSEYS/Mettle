import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";

const CATALOG = [
  // ── auras (tint the crystal's energy) ──
  { key: "ember_halo", name: "Ember Halo", description: "A ring of warm firelight for your crystal.", price: 60, rarity: "common", category: "aura", tint: "#fb923c", icon: "Flame" },
  { key: "frost_sigil", name: "Frost Sigil", description: "Cold blue light. Calm and precise.", price: 90, rarity: "uncommon", category: "aura", tint: "#7dd3fc", icon: "Snowflake" },
  { key: "verdant_heart", name: "Verdant Heart", description: "Life-green energy that hums softly.", price: 140, rarity: "rare", category: "aura", tint: "#4ade80", icon: "Leaf" },
  { key: "arc_crown", name: "Arc Crown", description: "Electric violet with an unstable edge.", price: 220, rarity: "epic", category: "aura", tint: "#a78bfa", icon: "Zap" },
  { key: "solar_core", name: "Solar Core", description: "Molten gold. The crystal burns bright.", price: 320, rarity: "legendary", category: "aura", tint: "#fbbf24", icon: "Sun" },

  // ── frames (UI chrome tint) ──
  { key: "slate_frame", name: "Slate Frame", description: "Matte carved slate. Understated authority.", price: 50, rarity: "common", category: "frame", tint: "#94a3b8", icon: "Frame" },
  { key: "azure_frame", name: "Azure Frame", description: "Cyan circuitry lines your panels.", price: 120, rarity: "uncommon", category: "frame", tint: "#22d3ee", icon: "Frame" },

  // ── titles (display titles while equipped) ──
  { key: "title_warden", name: "Warden's Declaration", description: "Bear the title: The Warden.", price: 150, rarity: "rare", category: "title", tint: "#94a3b8", icon: "Crown", titleGrant: "The Warden" },
  { key: "title_ascendant", name: "Ascendant's Oath", description: "Bear the title: The Ascendant.", price: 400, rarity: "legendary", category: "title", tint: "#fbbf24", icon: "Crown", titleGrant: "The Ascendant" },

  // ── effects (particle density boost on the hero) ──
  { key: "ember_trail", name: "Ember Trail", description: "Your crystal sheds burning motes.", price: 110, rarity: "uncommon", category: "effect", tint: "#fb923c", icon: "Sparkles" },
  { key: "star_shower", name: "Star Shower", description: "A dense spiral of stardust orbits you.", price: 280, rarity: "epic", category: "effect", tint: "#e879f9", icon: "Stars" },
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
      // upsert: keep catalog fresh (adds new items/categories on redeploy)
      if (!existing) {
        await ctx.db.insert("shopItems", { ...item });
      } else {
        await ctx.db.patch(existing._id, { ...item });
      }
    }
    return { ok: true };
  },
});

/** Public wrapper: ensures the catalog is seeded before listing. */
export const ensureCatalog = mutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("shopItems").collect();
    if (items.length < CATALOG.length) {
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
    const equippedRows = owned.filter((o) => o.equipped);
    return {
      items: items.map(({ _id, _creationTime, ...rest }) => rest),
      owned: ownedSet,
      equippedKeys: equippedRows.map((e) => e.itemKey),
    };
  },
});

/** Equipped item details grouped by category (for the 3D hero + UI). */
export const getMyEquipped = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const owned = await ctx.db
      .query("inventory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const equippedRows = owned.filter((o) => o.equipped);
    const out: Record<string, { key: string; name: string; tint: string; rarity: string; category: string; titleGrant?: string }> = {};
    for (const row of equippedRows) {
      const item = await ctx.db
        .query("shopItems")
        .withIndex("by_key", (q) => q.eq("key", row.itemKey))
        .first();
      if (item) {
        out[item.category] = {
          key: item.key,
          name: item.name,
          tint: item.tint,
          rarity: item.rarity,
          category: item.category,
          titleGrant: item.titleGrant,
        };
      }
    }
    return out;
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

    return { ok: true, goldLeft: char.gold - item.price, itemName: item.name };
  },
});

/** Equip / unequip. One item per category may be equipped. */
export const setEquipped = mutation({
  args: { itemKey: v.optional(v.string()) },
  handler: async (ctx, { itemKey }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const owned = await ctx.db
      .query("inventory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const findItem = async (key: string) =>
      await ctx.db
        .query("shopItems")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();

    if (!itemKey) {
      // unequip all
      for (const row of owned) {
        if (row.equipped) await ctx.db.patch(row._id, { equipped: false });
      }
      return { ok: true, equippedKeys: [] as string[] };
    }

    const target = owned.find((o) => o.itemKey === itemKey);
    if (!target) throw new Error("You don't own that item");
    const item = await findItem(itemKey);
    if (!item) throw new Error("Item not found");

    if (target.equipped) {
      // unequip just this one
      await ctx.db.patch(target._id, { equipped: false });
    } else {
      // unequip same-category item first (one per category)
      for (const row of owned) {
        if (!row.equipped || row.itemKey === itemKey) continue;
        const other = await findItem(row.itemKey);
        if (other && other.category === item.category) {
          await ctx.db.patch(row._id, { equipped: false });
        }
      }
      await ctx.db.patch(target._id, { equipped: true });
    }

    const equippedRows = owned.filter((o) => o.equipped).map((o) => o.itemKey);
    return { ok: true, equippedKeys: equippedRows };
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
          category: item.category,
          tint: item.tint,
          icon: item.icon,
          price: item.price,
        });
      }
    }
    return out.sort((a, b) => Number(b.equipped) - Number(a.equipped));
  },
});
