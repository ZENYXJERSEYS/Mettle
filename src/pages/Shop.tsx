import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  Flame,
  Leaf,
  Loader2,
  ShoppingBag,
  Snowflake,
  Sun,
  Zap,
  Check,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GameShell from "@/components/GameShell";
import { CATEGORY_META } from "@/convex/gameRules";

const ICONS: Record<string, LucideIcon> = { Flame, Leaf, Snowflake, Sun, Zap };

const RARITY_STYLES: Record<string, { ring: string; text: string; label: string }> = {
  common: { ring: "oklch(0.7 0.02 260 / 40%)", text: "text-muted-foreground", label: "Common" },
  rare: { ring: "oklch(0.72 0.14 195 / 55%)", text: "text-energy", label: "Rare" },
  epic: { ring: "oklch(0.68 0.19 295 / 65%)", text: "text-primary", label: "Epic" },
  legendary: { ring: "oklch(0.83 0.15 85 / 70%)", text: "text-gold", label: "Legendary" },
};

export default function Shop() {
  const shop = useQuery(api.shop.listShop) as
    | { items: { key: string; name: string; description: string; price: number; rarity: string; tint: string; icon: string }[]; owned: Set<string>; equippedKey: string | null }
    | null
    | undefined;
  const ensureCatalog = useMutation(api.shop.ensureCatalog);
  const purchase = useMutation(api.shop.purchaseItem);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    // Lazy seed on first visit
    if (shop !== undefined) {
      setSeeding(true);
      ensureCatalog().finally(() => setSeeding(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePurchase = async (itemKey: string) => {
    setBusyKey(itemKey);
    try {
      const res = await purchase({ itemKey });
      toast.success(`Purchased. Gold remaining: ${res.goldLeft}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <GameShell>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Shop</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Spend Gold on relics that tint your crystal's energy. Purchases are transactional — Gold is deducted server-side.
          </p>
        </div>

        {!shop ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="surface-panel ring-edge h-48 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : shop.items.length === 0 && seeding ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Preparing the shop...
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shop.items.map((item, i) => {
              const Icon = ICONS[item.icon] ?? Zap;
              const style = RARITY_STYLES[item.rarity] ?? RARITY_STYLES.common;
              const isOwned = shop.owned.has(item.key);
              const isEquipped = shop.equippedKey === item.key;
              return (
                <motion.article
                  key={item.key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  className="surface-quest ring-edge relative overflow-hidden rounded-xl p-4"
                >
                  <div
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[2px]"
                    style={{ background: `linear-gradient(90deg, transparent, ${item.tint}, transparent)` }}
                  />
                  <div className="flex items-start justify-between">
                    <div
                      className="flex size-11 items-center justify-center rounded-lg"
                      style={{ background: `${item.tint}1f`, boxShadow: `0 0 16px ${item.tint}33` }}
                    >
                      <Icon className="size-5" style={{ color: item.tint }} />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${style.text}`}>
                      {style.label}
                    </span>
                  </div>
                  <h2 className="font-display mt-3 text-base font-bold">{item.name}</h2>
                  <p className="mt-0.5 min-h-8 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-gold">{item.price} G</span>
                    {isOwned ? (
                      <span className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                        <Check className="size-3.5" /> Owned
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handlePurchase(item.key)}
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
                  {isEquipped && (
                    <div className="mt-2 rounded bg-primary/10 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-primary">
                      Equipped
                    </div>
                  )}
                </motion.article>
              );
            })}
          </div>
        )}
      </main>
    </GameShell>
  );
}
