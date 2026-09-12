import { useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  Award,
  Backpack,
  BookOpen,
  Check,
  Crown,
  Flame,
  Frame,
  Loader2,
  Moon,
  RefreshCw,
  Shield,
  Snowflake,
  Sparkles,
  Stars,
  Store,
  Sun,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GameShell from "@/components/GameShell";
import BrandedLoading from "@/components/BrandedLoading";
import HeroStage from "@/components/hero/HeroStage";
import type { EquippedMap } from "@/components/hero/HeroCrystal";
import { formForLevel } from "@/convex/gameRules";

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

const RARITY_BORDER: Record<string, string> = {
  common: "border-slate-500/40",
  uncommon: "border-cyan-400/50",
  rare: "border-violet-400/50",
  epic: "border-amber-300/60",
  legendary: "border-fuchsia-400/60",
  mythic: "border-fuchsia-300/70",
};

const RARITY_TEXT: Record<string, string> = {
  common: "text-slate-300",
  uncommon: "text-cyan-300",
  rare: "text-violet-300",
  epic: "text-amber-300",
  legendary: "text-fuchsia-300",
  mythic: "text-fuchsia-200",
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

const SLOTS: { category: string; icon: LucideIcon }[] = [
  { category: "aura", icon: Flame },
  { category: "core", icon: Zap },
  { category: "skin", icon: Shield },
  { category: "frame", icon: Frame },
  { category: "title", icon: Crown },
  { category: "badge", icon: Award },
  { category: "background", icon: Moon },
  { category: "effect", icon: Sparkles },
];

interface InvItem {
  _id: string;
  itemKey: string;
  equipped: boolean;
  acquiredAt: number;
  name: string;
  description: string;
  rarity: string;
  category: string;
  tint: string;
  icon: string;
  price: number;
  materialType?: string;
  titleGrant?: string;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Inventory() {
  const items = useQuery(api.shop.listMyInventory) as InvItem[] | null | undefined;
  const equippedByCategory = useQuery(api.shop.getMyEquipped) as
    | EquippedMap
    | null
    | undefined;
  const character = useQuery(api.characters.getMyCharacter);
  const setEquipped = useMutation(api.shop.setEquipped);
  const [busy, setBusy] = useState<string | null>(null);
  const [rarityFilter, setRarityFilter] = useState("all");
  const [detail, setDetail] = useState<InvItem | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const toggle = async (item: InvItem) => {
    setBusy(item.itemKey);
    try {
      await setEquipped({ itemKey: item.equipped ? undefined : item.itemKey });
      toast.success(
        item.equipped ? `${item.name} unequipped` : `${item.name} equipped — your character responds`,
      );
      setDetail(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const visibleItems = useMemo(() => {
    if (!items) return [];
    return rarityFilter === "all" ? items : items.filter((i) => i.rarity === rarityFilter);
  }, [items, rarityFilter]);

  if (loadError) {
    return (
      <GameShell>
        <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <Backpack className="size-10 text-muted-foreground/60" />
          <h1 className="font-display text-xl font-black tracking-widest">
            THE RELIC VAULT IS UNAVAILABLE
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            We could not load your collection right now. Your progress and purchases are safe.
          </p>
          <Button
            onClick={() => {
              setRetrying(true);
              setTimeout(() => {
                setLoadError(false);
                setRetrying(false);
              }, 400);
            }}
            className="mt-2 font-bold"
          >
            <RefreshCw className={`size-4 ${retrying ? "animate-spin" : ""}`} /> RETRY
          </Button>
        </main>
      </GameShell>
    );
  }

  if (items === undefined || items === null || character === undefined || character === null) {
    return (
      <GameShell>
        <BrandedLoading hint="Opening your vault..." />
      </GameShell>
    );
  }

  const auraTint = equippedByCategory?.aura?.tint ?? null;
  const frameTint = equippedByCategory?.frame?.tint ?? null;
  const bgTint = equippedByCategory?.background?.tint ?? null;
  const eqKeys = items.filter((i) => i.equipped).map((i) => i.itemKey);

  return (
    <GameShell>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">
            Character Loadout
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One relic per slot. Equipped items reshape your crystal — permanently, server-side.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-12">
          {/* ── left: character preview + slots ── */}
          <section className="lg:col-span-4" aria-label="Equipment slots">
            <div
              className="surface-hero ring-edge grain relative rounded-2xl p-5"
              style={
                bgTint
                  ? { background: `linear-gradient(180deg, ${bgTint}14, var(--card) 45%, var(--background))` }
                  : undefined
              }
            >
              <div
                className={`relative mx-auto rounded-2xl p-1 ${frameTint ? "" : "ring-1 ring-primary/20"}`}
                style={frameTint ? { boxShadow: `0 0 24px ${frameTint}33`, border: `1px solid ${frameTint}55` } : undefined}
              >
                <div className="relative h-52 w-full max-w-64">
                  <HeroStage
                    form={formForLevel(character.level)}
                    level={character.level}
                    state="idle"
                    equipped={equippedByCategory ?? null}
                  />
                </div>
              </div>
              <div className="mt-2 text-center">
                <div className="font-display text-lg font-black">{character.name}</div>
                <div className="text-xs text-muted-foreground">
                  {equippedByCategory?.title?.titleGrant
                    ? `Bearing the title ${equippedByCategory.title.titleGrant}`
                    : character.title}
                </div>
                {equippedByCategory?.badge && (
                  <span
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                    style={{
                      background: `${equippedByCategory.badge.tint}1f`,
                      color: equippedByCategory.badge.tint,
                    }}
                  >
                    <Check className="size-3" />
                    {equippedByCategory.badge.name}
                  </span>
                )}
              </div>

              {/* slots */}
              <div className="mt-4 space-y-2">
                {SLOTS.map(({ category, icon: SlotIcon }) => {
                  const eq = equippedByCategory?.[category];
                  return (
                    <div
                      key={category}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${
                        eq
                          ? RARITY_BORDER[eq.rarity] ?? "border-border"
                          : "border-dashed border-border/60"
                      }`}
                    >
                      <div
                        className="flex size-8 items-center justify-center rounded-md"
                        style={{ background: eq ? `${eq.tint}1f` : "oklch(1 0 0 / 4%)" }}
                      >
                        <SlotIcon
                          className="size-4"
                          style={{ color: eq ? eq.tint : "oklch(0.6 0.02 260)" }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                          {CATEGORY_LABEL[category] ?? category}
                        </div>
                        <div className="truncate text-xs font-semibold">
                          {eq ? eq.name : "Empty slot"}
                        </div>
                      </div>
                      {eq && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                          On
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── right: owned relics ── */}
          <section className="lg:col-span-8" aria-label="Owned relics">
            {/* rarity filter */}
            <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Rarity filter">
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
                  {r === "all" ? "All" : r}
                </button>
              ))}
            </div>

            {items.length === 0 ? (
              <div className="surface-panel ring-edge flex flex-col items-center gap-3 rounded-2xl py-16 text-center">
                {/* locked relic silhouette */}
                <div className="relative mb-1 flex h-20 w-20 items-center justify-center">
                  <div className="absolute inset-0 rotate-45 rounded-2xl border-2 border-dashed border-border/60" />
                  <Sparkles className="size-7 text-muted-foreground/30" />
                </div>
                <h2 className="font-display text-lg font-black tracking-wider">
                  YOUR SATCHEL IS EMPTY
                </h2>
                <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                  Every legend begins with a first relic. Complete quests to earn Gold, then claim
                  something worthy of your progress.
                </p>
                <Link to="/shop">
                  <Button className="glow-violet mt-1 font-bold">
                    <Store className="size-4" /> VISIT THE SHOP
                  </Button>
                </Link>
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="surface-panel ring-edge rounded-xl py-12 text-center text-sm text-muted-foreground">
                No relics of this rarity in your satchel.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {visibleItems.map((item, i) => {
                  const Icon = ICONS[item.icon] ?? Sparkles;
                  return (
                    <motion.article
                      key={item._id}
                      layout
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.35 }}
                      whileHover={{ y: -2 }}
                      className={`surface-quest ring-edge relative cursor-pointer overflow-hidden rounded-xl border ${
                        item.equipped
                          ? `${RARITY_BORDER[item.rarity] ?? "border-border"} glow-violet`
                          : "border-border/50"
                      }`}
                      onClick={() => setDetail(item)}
                    >
                      <div
                        aria-hidden
                        className="absolute inset-x-0 top-0 h-[2px]"
                        style={{ background: `linear-gradient(90deg, transparent, ${item.tint}, transparent)` }}
                      />
                      <div className="flex items-start justify-between p-4 pb-0">
                        <div
                          className="flex size-10 items-center justify-center rounded-lg"
                          style={{ background: `${item.tint}1f` }}
                        >
                          <Icon className="size-4.5" style={{ color: item.tint }} />
                        </div>
                        <div className="text-right">
                          <span
                            className={`block text-[10px] font-black uppercase tracking-widest ${
                              RARITY_TEXT[item.rarity] ?? "text-muted-foreground"
                            }`}
                          >
                            {item.rarity}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                            {CATEGORY_LABEL[item.category] ?? item.category}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 pt-3">
                        <h2 className="font-display text-base font-bold">{item.name}</h2>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {item.description}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="font-mono text-[10px] text-muted-foreground/70">
                            Acquired {formatDate(item.acquiredAt)}
                          </span>
                          {item.equipped ? (
                            <span className="flex items-center gap-1 rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">
                              <Check className="size-3.5" /> Equipped
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                void toggle(item);
                              }}
                              disabled={busy !== null}
                              className="font-semibold"
                            >
                              {busy === item.itemKey ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                "Equip"
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ── item detail panel ── */}
      {detail && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={`${detail.name} details`}
          onClick={() => setDetail(null)}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6 shadow-2xl"
          >
            <div
              className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border"
              style={{
                borderColor: `${detail.tint}66`,
                background: `${detail.tint}14`,
                boxShadow: `0 0 30px ${detail.tint}33`,
              }}
            >
              {(() => {
                const DIcon = ICONS[detail.icon] ?? Sparkles;
                return <DIcon className="size-8" style={{ color: detail.tint }} />;
              })()}
            </div>
            <div className="text-center">
              <span
                className={`text-[10px] font-black uppercase tracking-[0.25em] ${
                  RARITY_TEXT[detail.rarity] ?? ""
                }`}
              >
                {detail.rarity} · {CATEGORY_LABEL[detail.category] ?? detail.category}
              </span>
              <h2 className="font-display mt-1 text-xl font-black">{detail.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {detail.description}
              </p>
              <div className="mt-4 space-y-1 rounded-xl bg-secondary/40 p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Acquired</span>
                  <span className="font-mono">{formatDate(detail.acquiredAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Value</span>
                  <span className="font-mono text-gold">{detail.price} Gold</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-mono font-bold text-primary">
                    {detail.equipped ? "EQUIPPED" : "In satchel"}
                  </span>
                </div>
              </div>
              <Button
                onClick={() => void toggle(detail)}
                disabled={busy !== null}
                variant={detail.equipped ? "outline" : "default"}
                className="mt-4 w-full font-bold"
              >
                {busy === detail.itemKey ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : detail.equipped ? (
                  "UNEQUIP"
                ) : (
                  "EQUIP"
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </GameShell>
  );
}
