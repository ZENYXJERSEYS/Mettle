import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  Crown,
  Flame,
  Frame,
  Leaf,
  Loader2,
  RefreshCw,
  ShoppingBag,
  Snowflake,
  Sparkles,
  Stars,
  Sun,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GameShell from "@/components/GameShell";
import BrandedLoading from "@/components/BrandedLoading";

const ICONS: Record<string, LucideIcon> = {
  Flame,
  Leaf,
  Snowflake,
  Sun,
  Zap,
  Frame,
  Crown,
  Sparkles,
  Stars,
};

// Rarity material treatments
const RARITY: Record<
  string,
  { label: string; text: string; border: string; bg: string; glow: string }
> = {
  common: {
    label: "Common",
    text: "text-slate-300",
    border: "border-slate-500/40",
    bg: "bg-slate-500/10",
    glow: "none",
  },
  uncommon: {
    label: "Uncommon",
    text: "text-cyan-300",
    border: "border-cyan-400/50",
    bg: "bg-cyan-400/10",
    glow: "0 0 18px oklch(0.72 0.14 195 / 35%)",
  },
  rare: {
    label: "Rare",
    text: "text-violet-300",
    border: "border-violet-400/50",
    bg: "bg-violet-400/10",
    glow: "0 0 22px oklch(0.68 0.19 295 / 40%)",
  },
  epic: {
    label: "Epic",
    text: "text-amber-300",
    border: "border-amber-300/60",
    bg: "bg-amber-300/10",
    glow: "0 0 26px oklch(0.83 0.13 90 / 45%)",
  },
  legendary: {
    label: "Legendary",
    text: "text-fuchsia-300",
    border: "border-fuchsia-400/60",
    bg: "bg-fuchsia-400/10",
    glow: "0 0 30px oklch(0.74 0.19 320 / 55%), 0 0 60px oklch(0.68 0.19 295 / 25%)",
  },
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
  titleGrant?: string;
}

interface ShopData {
  items: ShopItem[];
  owned: Set<string>;
  equippedKeys: string[];
}

export default function Shop() {
  const shop = useQuery(api.shop.listShop) as ShopData | null | undefined;
  const ensureCatalog = useMutation(api.shop.ensureCatalog);
  const purchase = useMutation(api.shop.purchaseItem);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [justPurchased, setJustPurchased] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    ensureCatalog()
      .then(() => setSeeding(false))
      .catch((e) => {
        setLoadError(e instanceof Error ? e.message : "The shop didn't load");
        setSeeding(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePurchase = async (item: ShopItem) => {
    setBusyKey(item.key);
    try {
      const res = await purchase({ itemKey: item.key });
      setJustPurchased(item.key);
      toast.success(`${res.itemName} claimed. Gold remaining: ${res.goldLeft}`);
      setTimeout(() => setJustPurchased(null), 1600);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setBusyKey(null);
    }
  };

  if (loadError) {
    return (
      <GameShell>
        <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <AlertTriangle className="size-10 text-destructive/80" />
          <h1 className="font-display text-xl font-bold">The merchant is unavailable</h1>
          <p className="max-w-sm text-sm text-muted-foreground">{loadError}</p>
          <Button
            onClick={() => {
              setLoadError(null);
              setSeeding(true);
              ensureCatalog()
                .then(() => setSeeding(false))
                .catch((e) => {
                  setLoadError(e instanceof Error ? e.message : "Still unreachable");
                  setSeeding(false);
                });
            }}
            className="mt-2 font-semibold"
          >
            <RefreshCw className="size-4" /> Try again
          </Button>
        </main>
      </GameShell>
    );
  }

  if (!shop) {
    return (
      <GameShell>
        <BrandedLoading hint={seeding ? "Stocking the shop..." : undefined} />
      </GameShell>
    );
  }

  const categories = ["all", ...Array.from(new Set(shop.items.map((i) => i.category)))];
  const visible = categoryFilter === "all" ? shop.items : shop.items.filter((i) => i.category === categoryFilter);

  return (
    <GameShell>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Shop</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Relics of every rarity. Purchases are transactional — Gold is deducted server-side.
          </p>
        </div>

        {/* category filter */}
        <div className="mb-5 flex flex-wrap gap-1.5">
          {categories.map((c) => (
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
              {c}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item, i) => {
            const Icon = ICONS[item.icon] ?? Sparkles;
            const style = RARITY[item.rarity] ?? RARITY.common;
            const isOwned = shop.owned.has(item.key);
            const isEquipped = shop.equippedKeys.includes(item.key);
            const affordable = (shop as { goldAvailable?: number }).goldAvailable !== 0; // gold checked server-side
            return (
              <motion.article
                key={item.key}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.4 }}
                className={`surface-quest ring-edge relative overflow-hidden rounded-xl border ${style.border}`}
                style={{ boxShadow: style.glow === "none" ? undefined : style.glow }}
              >
                {/* rarity top edge */}
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
                      {item.category}
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
                        onClick={() => handlePurchase(item)}
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

                {/* purchase confirmation sweep */}
                <AnimatePresence>
                  {justPurchased === item.key && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/85 backdrop-blur-sm"
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15 }}
                        className="flex size-12 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-400"
                      >
                        <Check className="size-6 text-emerald-400" strokeWidth={3} />
                      </motion.div>
                      <span className="font-display text-sm font-black uppercase tracking-widest text-emerald-300">
                        Claimed
                      </span>
                      <span className="font-mono text-xs text-gold">-{item.price} G</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </div>
      </main>
    </GameShell>
  );
}
