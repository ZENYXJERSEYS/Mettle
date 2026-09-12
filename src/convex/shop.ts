import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";

// ── CATALOG — 14 relics, 8 categories, all 6 rarities ────────────────────────
// materialType drives the 3D/UI treatment: matte | energy | glass | metal | crystal | cosmic
const CATALOG = [
  // ── energy cores (inner crystal color) ──
  { key: "ember_core", name: "Ember Core", description: "A smoldering heart of warm firelight.", price: 80, rarity: "common", category: "core", tint: "#fb923c", icon: "Flame", materialType: "matte" },
  { key: "aurora_shard", name: "Aurora Shard", description: "Polar light, fractured into a core.", price: 180, rarity: "rare", category: "core", tint: "#5eead4", icon: "Snowflake", materialType: "glass" },
  { key: "ascendant_core", name: "Ascendant Core", description: "A galactic furnace. Only the persistent may hold it.", price: 550, rarity: "mythic", category: "core", tint: "#e879f9", icon: "Sparkles", materialType: "cosmic" },

  // ── auras (glow, rings, dust around the crystal) ──
  { key: "violet_pulse", name: "Violet Pulse", description: "A violet heartbeat that never rests.", price: 120, rarity: "uncommon", category: "aura", tint: "#a78bfa", icon: "Zap", materialType: "energy" },
  { key: "stormrunner_aura", name: "Stormrunner Aura", description: "Charged air. Static clings to your form.", price: 200, rarity: "epic", category: "aura", tint: "#38bdf8", icon: "Wind", materialType: "metal" },
  { key: "astral_mantle", name: "Astral Mantle", description: "The cloak of starlight worn by those who endure.", price: 250, rarity: "legendary", category: "aura", tint: "#fbbf24", icon: "Sun", materialType: "crystal" },

  // ── skins (crystal shell color) ──
  { key: "titan_protocol", name: "Titan Protocol", description: "Armor-plated facets, forged under pressure.", price: 320, rarity: "epic", category: "skin", tint: "#94a3b8", icon: "Shield", materialType: "metal" },

  // ── frames (profile chrome) ──
  { key: "wanderers_frame", name: "Wanderer's Frame", description: "Honest slate. Where every legend starts.", price: 40, rarity: "common", category: "frame", tint: "#94a3b8", icon: "Frame", materialType: "matte" },
  { key: "iron_will_frame", name: "Iron Will Frame", description: "Brushed steel resolve around your name.", price: 160, rarity: "rare", category: "frame", tint: "#cbd5e1", icon: "Frame", materialType: "metal" },

  // ── titles ──
  { key: "the_unbroken", name: "The Unbroken Title", description: "Bear the title: The Unbroken.", price: 220, rarity: "epic", category: "title", tint: "#f87171", icon: "Award", materialType: "metal", titleGrant: "The Unbroken" },
  { key: "voidglass_crown", name: "Voidglass Crown", description: "Bear the title: Sovereign of the Voidglass.", price: 600, rarity: "mythic", category: "title", tint: "#c084fc", icon: "Crown", materialType: "cosmic", titleGrant: "the Voidglass Sovereign" },

  // ── badges ──
  { key: "scholars_sigil", name: "Scholar's Sigil", description: "A badge for minds that show up daily.", price: 70, rarity: "common", category: "badge", tint: "#7dd3fc", icon: "BookOpen", materialType: "matte" },

  // ── backgrounds ──
  { key: "obsidian_veil", name: "Obsidian Veil", description: "A deep-space backdrop behind your character.", price: 150, rarity: "rare", category: "background", tint: "#818cf8", icon: "Moon", materialType: "glass" },

  // ── completion effects ──
  { key: "celestial_flame", name: "Celestial Flame", description: "Completing a quest ignites the heavens.", price: 400, rarity: "legendary", category: "effect", tint: "#fda4af", icon: "Stars", materialType: "crystal" },
] as const;

const RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;

/** Internal: idempotent catalog seed — upserts new items, removes retired keys + orphaned rows. */
export const seedCatalogInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("shopItems").collect();
    const byKey = new Map<string, (typeof all)[number]>();
    for (const doc of all) byKey.set(doc.key, doc);

    for (const item of CATALOG) {
      const existing = byKey.get(item.key);
      if (!existing) {
        await ctx.db.insert("shopItems", { ...item });
      } else {
        await ctx.db.patch(existing._id, { ...item });
      }
    }

    // retire keys no longer in the catalog and clean orphaned inventory rows
    const validKeys: Set<string> = new Set(CATALOG.map((i) => i.key));
    for (const item of all) {
      if (!validKeys.has(item.key)) {
        const orphans = await ctx.db
          .query("inventory")
          .filter((q) => q.eq(q.field("itemKey"), item.key))
          .collect();
        for (const row of orphans) await ctx.db.delete(row._id);
        await ctx.db.delete(item._id);
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
    if (items.length !== CATALOG.length) {
      await ctx.runMutation(internal.shop.seedCatalogInternal, {});
    }
    return { ok: true };
  },
});

/** Catalog + ownership state + gold for the caller. */
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
    const char = await ctx.db
      .query("characters")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const ownedSet = new Set(owned.map((o) => o.itemKey));
    const equippedRows = owned.filter((o) => o.equipped);
    const order = new Map<string, number>(RARITIES.map((r, i) => [r as string, i]));
    const sorted = [...items].sort(
      (a, b) =>
        (order.get(a.rarity) ?? 0) - (order.get(b.rarity) ?? 0) || a.price - b.price,
    );

    return {
      items: sorted.map(({ _id, _creationTime, ...rest }) => rest),
      owned: ownedSet,
      equippedKeys: equippedRows.map((e) => e.itemKey),
      gold: char?.gold ?? 0,
      acquiredAt: Object.fromEntries(owned.map((o) => [o.itemKey, o.acquiredAt])),
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
    const out: Record<
      string,
      { key: string; name: string; tint: string; rarity: string; category: string; titleGrant?: string }
    > = {};
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

/** Transactional purchase: verify item, uniqueness, funds; deduct gold; grant ownership; write receipt. */
export const purchaseItem = mutation({
  args: { itemKey: v.string() },
  handler: async (ctx, { itemKey }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // 1. item exists
    const item = await ctx.db
      .query("shopItems")
      .withIndex("by_key", (q) => q.eq("key", itemKey))
      .first();
    if (!item) throw new Error("This relic is no longer available");

    // 2. unique ownership
    const existing = await ctx.db
      .query("inventory")
      .withIndex("by_user_item", (q) => q.eq("userId", userId).eq("itemKey", itemKey))
      .first();
    if (existing) throw new Error("You already own this relic");

    // 3. sufficient gold (never negative)
    const char = await ctx.db
      .query("characters")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!char) throw new Error("Create your character first");
    if (char.gold < item.price) {
      throw new Error(`Not enough Gold — you need ${item.price - char.gold} more`);
    }

    const now = Date.now();
    // 4. atomic: deduct + grant + receipt in one transaction
    await ctx.db.patch(char._id, { gold: char.gold - item.price });
    await ctx.db.insert("inventory", {
      userId,
      itemKey,
      equipped: false,
      acquiredAt: now,
    });
    await ctx.db.insert("purchaseTransactions", {
      userId,
      itemKey,
      pricePaid: item.price,
      purchasedAt: now,
    });
    await ctx.db.insert("activityLog", {
      userId,
      kind: "purchase",
      message: `Claimed ${item.name}`,
      icon: item.icon,
      gold: -item.price,
      dayKey: new Date(now).toISOString().slice(0, 10),
      createdAt: now,
    });

    return {
      ok: true,
      goldLeft: char.gold - item.price,
      itemName: item.name,
      rarity: item.rarity,
    };
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
      for (const row of owned) {
        if (row.equipped) await ctx.db.patch(row._id, { equipped: false });
      }
      return { ok: true, equippedKeys: [] as string[] };
    }

    const target = owned.find((o) => o.itemKey === itemKey);
    if (!target) throw new Error("You don't own that relic");
    const item = await findItem(itemKey);
    if (!item) throw new Error("Relic not found");

    if (target.equipped) {
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
          acquiredAt: row.acquiredAt,
          name: item.name,
          description: item.description,
          rarity: item.rarity,
          category: item.category,
          tint: item.tint,
          icon: item.icon,
          price: item.price,
          materialType: item.materialType,
          titleGrant: item.titleGrant,
        });
      }
    }
    return out.sort(
      (a, b) => Number(b.equipped) - Number(a.equipped) || b.acquiredAt - a.acquiredAt,
    );
  },
});

/** Demo seed (dev fixture, not exposed in UI): grants starting relic + gold so the
 *  demo inventory/equipment states are reachable without a cheat button. */
export const grantDemoRelic = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db
      .query("inventory")
      .withIndex("by_user_item", (q) => q.eq("userId", userId).eq("itemKey", "violet_pulse"))
      .first();
    if (existing) return { ok: true };
    const now = Date.now();
    await ctx.db.patch(
      (await ctx.db.query("characters").withIndex("by_user", (q) => q.eq("userId", userId)).first())!._id,
      { gold: 260 },
    );
    await ctx.db.insert("inventory", {
      userId,
      itemKey: "violet_pulse",
      equipped: true,
      acquiredAt: now,
    });
    await ctx.db.insert("purchaseTransactions", {
      userId,
      itemKey: "violet_pulse",
      pricePaid: 0,
      purchasedAt: now,
    });
    return { ok: true };
  },
});
