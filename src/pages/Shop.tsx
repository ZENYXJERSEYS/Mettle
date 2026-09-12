import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Award,
  BookOpen,
  Check,
  Coins,
  Crown,
  Flame,
  Frame,
  Loader2,
  Moon,
  RefreshCw,
  Shield,
  ShoppingBag,
  Snowflake,
  Sparkles,
  Stars,
  Sun,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GameShell from "@/components/GameShell";
import BrandedLoading from "@/components/BrandedLoading";
import { toast } from "sonner";

const ICONS: Record<string, LucideIcon> = {
  Flame,
  Snowflake,
  Sun,
  Zap,
  Frame,
  Crown,
  Sparkles,
  Stars,
  Wind,
  Shield,
  Award,
  BookOpen,
  Moon,
};

const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;

const RARITY: Record<
  string,
  { label: string; text: string; border: string; bg: string; glow: string; particle: string }
> = {
  common: {
    label: "Common",
    text: "text-slate-300",
    border: "border-slate-500/40",
    bg: "bg-slate-500/10",
    glow: "none",
    particle: "#94a3b8",
  },
  uncommon: {
    label: "Uncommon",
    text: "text-cyan-300",
    border: "border-cyan-400/50",
    bg: "bg-cyan-400/10",
    glow: "0 0 18px oklch(0.72 0.14 195 / 35%)",
    particle: "#67e8f9",
  },
  rare: {
    label: "Rare",
    text: "text-violet-300",
    border: "border-violet-400/50",
    bg: "bg-violet-400/10",
    glow: "0 0 22px oklch(0.68 0.19 295 / 40%)",
    particle: "#c4b5fd",
  },
  epic: {
    label: "Epic",
    text: "text-amber-300",
    border: "border-amber-300/60",
    bg: "bg-amber-300/10",
    glow: "0 0 26px oklch(0.83 0.13 90 / 45%)",
    particle: "#fde68a",
  },
  legendary: {
    label: "Legendary",
    text: "text-fuchsia-300",
    border: "border-fuchsia-400/60",
    bg: "bg-fuchsia-400/10",
    glow: "0 0 30px oklch(0.74 0.19 320 / 55%), 0 0 60px oklch(0.68 0.19 295 / 25%)",
    particle: "#f0abfc",
  },
  mythic: {
    label: "Mythic",
    text: "text-fuchsia-200",
    border: "border-fuchsia-300/70",
    bg: "bg-fuchsia-300/10",
    glow: "0 0 34px oklch(0.78 0.21 320 / 65%), 0 0 70px oklch(0.68 0.19 295 / 30%)",
    particle: "#f5d0fe",
  },
};

const CATEGORY_LABEL: Record<string, string> = {
  aura: "Aura",
  core: "Energy Core",
  skin: "Character Skin",
  frame: "Profile Frame",
  title: "Title",
  badge: "Badge",
  background: "Background",
  effect: "Completion Effect",
};

interface ShopItem {
  key: string;
  name: string;
  description: string;
  price: number;
  rarity: string;
  category: string;
  tint: string;
  icon: string;
  materialType?: string;
  titleGrant?: string;
}

interface ShopData {
  items: ShopItem[];
  owned: Set<string>;
  equippedKeys: string[];
  gold: number;
  acquiredAt: Record<string, number>;
}

/** Rarity-scaled particle burst used by the purchase animation. */
function PurchaseParticles({ color, count }: { color: string; count: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const dx = Math.cos(angle) * (50 + (i % 3) * 18);
        const dy = Math.sin(angle) * (50 + (i % 4) * 16);
        return (
          <motion.span
            key={i}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{ opacity: 0, x: dx, y: dy, scale: 0.3 }}
            transition={{ duration: 1.1, delay: i * 0.02, ease: "easeOut" }}
            className="absolute left-1/2 top-1/2 size-1.5 rounded-full"
            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          />
        );
      })}
    </div>
  );
}

export default function Shop() {
  const shop = useQuery(api.shop.listShop) as ShopData | null | undefined;
  const character = useQuery(api.characters.getMyCharacter);
  const ensureCatalog = useMutation(api.shop.ensureCatalog);
  const purchase = useMutation(api.shop.purchaseItem);
  const setEquipped = useMutation(api.shop.setEquipped);

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [seeding, setSeeding] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [acquired, setAcquired] = useState<ShopItem | null>(null);

  useEffect(() => {
    ensureCatalog()
      .then(() => setSeeding(false))
      .catch(() => {
        setLoadError(true);
        setSeeding(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const featured = useMemo(() => {
    if (!shop) return null;
    return (
      shop.items.find((i) => i.rarity === "mythic") ??
      shop.items.find((i) => i.rarity === "legendary") ??
      null
    );
  }, [shop]);

  const visible = useMemo(() => {
    if (!shop) return [];
    return shop.items.filter(
      (i) =>
        (categoryFilter === "all" || i.category === categoryFilter) &&
        (rarityFilter === "all" || i.rarity === rarityFilter),
    );
  }, [shop, categoryFilter, rarityFilter]);

  const recentlyUnlocked = useMemo(() => {
    if (!shop) return [];
    return Object.entries(shop.acquiredAt)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => shop.items.find((i) => i.key === key))
      .filter((x): x is ShopItem => Boolean(x));
  }, [shop]);

  const recommended = useMemo(() => {
    if (!shop || !character) return [];
    return shop.items
      .filter((i) => !shop.owned.has(i.key) && i.price <= character.gold + 120)
      .sort((a, b) => b.price - a.price)
      .slice(0, 3);
  }, [shop, character]);

  const handleClaim = async () => {
    if (!confirmItem) return;
    setBusyKey(confirmItem.key);
    try {
      await purchase({ itemKey: confirmItem.key });
      setAcquired(confirmItem); // opens the reward reveal
      setConfirmItem(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The forge rejected the transaction");
    } finally {
      setBusyKey(null);
    }
  };

  const handleEquipFromReward = async (item: ShopItem) => {
    try {
      await setEquipped({ itemKey: item.key });
      toast.success(`${item.name} equipped — your character responds`);
      setAcquired(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not equip");
    }
  };

  if (loadError) {
    return (
      <GameShell>
        <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <Flame className="size-10 text-muted-foreground/60" />
          <h1 className="font-display text-xl font-black tracking-widest">
            THE FORGE IS TEMPORARILY CLOSED
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            The relic catalog could not be loaded. Your progress is safe.
          </p>
          <Button
            onClick={() => {
              setLoadError(false);
              setSeeding(true);
              ensureCatalog()
                .then(() => setSeeding(false))
                .catch(() => setLoadError(true));
            }}
            className="mt-2 font-bold"
          >
            <RefreshCw className="size-4" /> RETRY
          </Button>
        </main>
      </GameShell>
    );
  }

  if (!shop) {
    return (
      <GameShell>
        <BrandedLoading hint={seeding ? "Stocking the shop..." : "Reforging your progression..."} />
      </GameShell>
    );
  }

  const rarityCounts = new Map<string, number>();
  for (const i of shop.items) rarityCounts.set(i.rarity, (rarityCounts.get(i.rarity) ?? 0) + 1);

  const renderCard = (item: ShopItem, i: number) => {
    const Icon = ICONS[item.icon] ?? Sparkles;
    const style = RARITY[item.rarity] ?? RARITY.common;
    const isOwned = shop.owned.has(item.key);
    const isEquipped = shop.equippedKeys.includes(item.key);
    const canAfford = shop.gold >= item.price;
    return (
      <motion.article
        key={item.key}
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.4 }}
        whileHover={{ y: -3 }}
        className={`surface-quest ring-edge relative overflow-hidden rounded-xl border ${style.border}`}
        style={{ boxShadow: style.glow === "none" ? undefined : style.glow }}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent, ${item.tint}, transparent)` }}
        />
        <div className="flex items-start justify-between p-4 pb-0">
          <div
            className={`flex size-11 items-center justify-center rounded-lg border ${style.border} ${style.bg}`}
            style={{ boxShadow: style.glow === "none" ? undefined : style.glow }}
          >
            <Icon className="size-5" style={{ color: item.tint }} />
          </div>
          <div className="text-right">
            <span className={`block text-[10px] font-black uppercase tracking-widest ${style.text}`}>
              {style.label}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {CATEGORY_LABEL[item.category] ?? item.category}
            </span>
          </div>
        </div>
        <div className="p-4 pt-3">
          <h2 className="font-display text-base font-bold">{item.name}</h2>
          <p className="mt-0.5 min-h-8 text-xs leading-relaxed text-muted-foreground">
            {item.description}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="font-mono text-sm font-bold text-gold">{item.price} G</span>
            {isOwned ? (
              isEquipped ? (
                <span className="flex items-center gap-1 rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">
                  <Check className="size-3.5" /> Equipped
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-400">
                  <Check className="size-3.5" /> Owned
                </span>
              )
            ) : (
              <Button
                size="sm"
                onClick={() => setConfirmItem(item)}
                disabled={busyKey !== null}
                className="font-semibold"
              >
                {busyKey === item.key ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ShoppingBag className="size-4" />
                )}
                Buy
              </Button>
            )}
          </div>
        </div>

        {/* insufficient-gold state — informative, never broken */}
        {!canAfford && !isOwned && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-background/80 p-4 text-center backdrop-blur-[2px]">
            <Coins className="size-5 text-gold/70" />
            <span className="font-display text-xs font-black uppercase tracking-widest text-foreground/90">
              NOT ENOUGH GOLD
            </span>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Complete more real-world quests to claim this relic.
            </p>
            <p className="font-mono text-[11px] text-gold/80">
              Need {item.price} — you have {shop.gold}.
            </p>
            <Link
              to="/dashboard"
              className="mt-1 rounded-lg bg-secondary/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground transition hover:bg-secondary"
            >
              View quests
            </Link>
          </div>
        )}
      </motion.article>
    );
  };

  return (
    <GameShell>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">
            The Relic Forge
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every relic is permanent, transactional, and earned with real Gold from real quests.
          </p>
        </div>

        {/* featured relic — legendary or mythic */}
        {featured && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={`surface-hero ring-edge grain relative mb-6 overflow-hidden rounded-2xl border ${
              RARITY[featured.rarity]?.border ?? "border-border"
            }`}
            style={{
              boxShadow:
                RARITY[featured.rarity]?.glow === "none" ? undefined : RARITY[featured.rarity]?.glow,
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-40"
              style={{
                background: `radial-gradient(ellipse 60% 80% at 75% 20%, ${featured.tint}33, transparent 70%)`,
              }}
            />
            <div className="relative grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:p-6">
              <div>
                <span
                  className={`text-[10px] font-black uppercase tracking-[0.3em] ${
                    RARITY[featured.rarity]?.text ?? "text-muted-foreground"
                  }`}
                >
                  Featured — {RARITY[featured.rarity]?.label}
                </span>
                <h2 className="font-display mt-2 text-2xl font-black sm:text-3xl">
                  {featured.name}
                </h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  {featured.description}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="font-mono text-lg font-bold text-gold">
                    {featured.price} G
                  </span>
                  <span className="rounded-full bg-secondary/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {CATEGORY_LABEL[featured.category] ?? featured.category}
                  </span>
                  {shop.owned.has(featured.key) ? (
                    <span className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-400">
                      <Check className="size-3.5" /> In your satchel
                    </span>
                  ) : (
                    <Button
                      onClick={() => setConfirmItem(featured)}
                      disabled={busyKey !== null}
                      className="glow-violet font-bold"
                    >
                      <ShoppingBag className="size-4" /> Claim this relic
                    </Button>
                  )}
                </div>
              </div>
              <div className="relative mx-auto h-36 w-36 shrink-0 sm:h-44 sm:w-44">
                <div
                  className="absolute inset-0 rounded-full opacity-70"
                  style={{
                    background: `radial-gradient(circle, ${featured.tint}55, transparent 65%)`,
                    filter: "blur(6px)",
                  }}
                />
                <div className="relative flex h-full items-center justify-center">
                  {(() => {
                    const FIcon = ICONS[featured.icon] ?? Sparkles;
                    return (
                      <motion.div
                        animate={{ rotate: [0, 6, -6, 0], scale: [1, 1.05, 1] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        className="flex size-20 items-center justify-center rounded-2xl border"
                        style={{
                          borderColor: `${featured.tint}66`,
                          background: `${featured.tint}14`,
                          boxShadow: `0 0 40px ${featured.tint}44`,
                        }}
                      >
                        <FIcon className="size-10" style={{ color: featured.tint }} />
                      </motion.div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* filters */}
        <section aria-label="Filters" className="mb-5 space-y-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Rarity filter">
            {["all", ...RARITY_ORDER].map((r) => (
              <button
                key={r}
                onClick={() => setRarityFilter(r)}
                aria-pressed={rarityFilter === r}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider ring-1 transition-all ${
                  rarityFilter === r
                    ? "bg-primary/15 text-primary ring-primary/40"
                    : "ring-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "all" ? "All rarities" : RARITY[r]?.label ?? r}
                {r !== "all" && rarityCounts.get(r) ? (
                  <span className="ml-1.5 font-mono text-[10px] opacity-60">
                    {rarityCounts.get(r)}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Category filter">
            {["all", ...Object.keys(CATEGORY_LABEL)].map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                aria-pressed={categoryFilter === c}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider ring-1 transition-all ${
                  categoryFilter === c
                    ? "bg-primary/15 text-primary ring-primary/40"
                    : "ring-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {c === "all" ? "All categories" : CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </section>

        {/* recently unlocked / recommended rails */}
        {(recentlyUnlocked.length > 0 || recommended.length > 0) && (
          <div className="mb-6 grid gap-3 md:grid-cols-2">
            {recentlyUnlocked.length > 0 && (
              <div className="surface-panel ring-edge rounded-xl p-4">
                <h2 className="mb-2.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Recently unlocked
                </h2>
                <div className="flex flex-wrap gap-2">
                  {recentlyUnlocked.map((item) => {
                    const RIcon = ICONS[item.icon] ?? Sparkles;
                    return (
                      <span
                        key={item.key}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                        style={{ background: `${item.tint}1f`, color: item.tint }}
                      >
                        <RIcon className="size-3.5" />
                        {item.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {recommended.length > 0 && (
              <div className="surface-panel ring-edge rounded-xl p-4">
                <h2 className="mb-2.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Recommended for your character
                </h2>
                <div className="flex flex-wrap gap-2">
                  {recommended.map((item) => {
                    const RIcon = ICONS[item.icon] ?? Sparkles;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setConfirmItem(item)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1 ring-border/60 transition hover:ring-primary/40"
                      >
                        <RIcon className="size-3.5" style={{ color: item.tint }} />
                        {item.name}
                        <span className="font-mono text-[10px] text-gold/80">{item.price} G</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item, i) => renderCard(item, i))}
        </div>
        {visible.length === 0 && (
          <div className="surface-panel ring-edge rounded-xl py-14 text-center">
            <Sparkles className="mx-auto size-7 text-muted-foreground/40" />
            <p className="font-display mt-3 text-sm font-black tracking-widest">
              NO RELICS MATCH THESE FILTERS
            </p>
          </div>
        )}
      </main>

      {/* ── claim confirmation modal ── */}
      <AnimatePresence>
        {confirmItem && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm purchase"
            onClick={() => setConfirmItem(null)}
          >
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 18 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6 shadow-2xl"
            >
              <div className="text-center">
                <div
                  className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border"
                  style={{
                    borderColor: `${confirmItem.tint}66`,
                    background: `${confirmItem.tint}14`,
                    boxShadow: `0 0 26px ${confirmItem.tint}33`,
                  }}
                >
                  {(() => {
                    const CIcon = ICONS[confirmItem.icon] ?? Sparkles;
                    return <CIcon className="size-7" style={{ color: confirmItem.tint }} />;
                  })()}
                </div>
                <h2 className="font-display text-lg font-black tracking-[0.12em]">
                  CLAIM THIS RELIC?
                </h2>
                <div className="mt-1 text-sm font-bold">{confirmItem.name}</div>
                <div
                  className={`text-[10px] font-black uppercase tracking-[0.25em] ${
                    RARITY[confirmItem.rarity]?.text ?? ""
                  }`}
                >
                  {RARITY[confirmItem.rarity]?.label} {CATEGORY_LABEL[confirmItem.category] ?? confirmItem.category}
                </div>

                <div className="mt-5 space-y-1.5 rounded-xl bg-secondary/40 p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-mono font-bold text-gold">{confirmItem.price} Gold</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your balance</span>
                    <span className="font-mono font-bold">{shop.gold} Gold</span>
                  </div>
                  <div className="flex justify-between border-t border-border/50 pt-1.5">
                    <span className="text-muted-foreground">After purchase</span>
                    <span className="font-mono font-bold">{shop.gold - confirmItem.price} Gold</span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  This relic will be added permanently to your Inventory.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleClaim}
                    disabled={busyKey !== null || shop.gold < confirmItem.price}
                    className="glow-violet font-bold"
                  >
                    {busyKey === confirmItem.key ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "CLAIM RELIC"
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setConfirmItem(null)} disabled={busyKey !== null}>
                    CANCEL
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── reward reveal modal ── */}
      <AnimatePresence>
        {acquired && (
          <motion.div
            key="reward"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Relic acquired"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-lg" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-sm rounded-2xl border border-border/60 bg-card p-7 text-center shadow-2xl"
              style={{ boxShadow: `0 0 60px ${acquired.tint}22` }}
            >
              <PurchaseParticles
                color={RARITY[acquired.rarity]?.particle ?? "#a78bfa"}
                count={acquired.rarity === "mythic" ? 18 : acquired.rarity === "legendary" ? 14 : 10}
              />
              <motion.div
                initial={{ y: 40, opacity: 0, scale: 0.7 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.15 }}
                className="mx-auto mb-5 flex size-20 items-center justify-center rounded-3xl border"
                style={{
                  borderColor: `${acquired.tint}77`,
                  background: `${acquired.tint}16`,
                  boxShadow: `0 0 50px ${acquired.tint}44`,
                }}
              >
                {(() => {
                  const AIcon = ICONS[acquired.icon] ?? Sparkles;
                  return <AIcon className="size-10" style={{ color: acquired.tint }} />;
                })()}
              </motion.div>

              <h2 className="font-display text-xl font-black tracking-[0.14em] text-gold">
                RELIC ACQUIRED
              </h2>
              <p className="mt-2 text-sm text-foreground/90">
                <span className="font-bold">{acquired.name}</span> has joined your collection.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {acquired.category === "aura" || acquired.category === "core"
                  ? "Your character's energy will change when equipped."
                  : "Equip it to reshape your character."}
              </p>
              <p className="mt-3 font-mono text-xs text-gold/70">
                -{acquired.price} Gold · permanent
              </p>

              <Button
                onClick={() => handleEquipFromReward(acquired)}
                className="glow-violet mt-6 w-full py-3 font-black tracking-widest"
              >
                EQUIP NOW
              </Button>
              <button
                type="button"
                onClick={() => setAcquired(null)}
                className="mt-2 w-full rounded-xl py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
              >
                Later — keep it in my satchel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GameShell>
  );
}
