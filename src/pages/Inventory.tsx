import { useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  Backpack,
  Crown,
  Flame,
  Frame,
  Leaf,
  Loader2,
  Snowflake,
  Sparkles,
  Stars,
  Store,
  Sun,
  User,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GameShell from "@/components/GameShell";
import HeroStage from "@/components/hero/HeroStage";
import { CATEGORY_META, formForLevel } from "@/convex/gameRules";

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

const RARITY_BORDER: Record<string, string> = {
  common: "border-slate-500/40",
  uncommon: "border-cyan-400/50",
  rare: "border-violet-400/50",
  epic: "border-amber-300/60",
  legendary: "border-fuchsia-400/60",
};

const CATEGORY_LABEL: Record<string, string> = {
  aura: "Aura",
  frame: "Frame",
  title: "Title",
  effect: "Effect",
  avatar: "Avatar",
};

const SLOTS: { category: string; icon: LucideIcon }[] = [
  { category: "aura", icon: Flame },
  { category: "frame", icon: Frame },
  { category: "title", icon: Crown },
  { category: "effect", icon: Sparkles },
  { category: "avatar", icon: User },
];

interface InvItem {
  _id: string;
  itemKey: string;
  equipped: boolean;
  name: string;
  description: string;
  rarity: string;
  category: string;
  tint: string;
  icon: string;
  price: number;
}

export default function Inventory() {
  const items = useQuery(api.shop.listMyInventory) as InvItem[] | null | undefined;
  const equippedByCategory = useQuery(api.shop.getMyEquipped) as
    | Record<string, { key: string; name: string; tint: string; rarity: string; category: string }>
    | null
    | undefined;
  const character = useQuery(api.characters.getMyCharacter);
  const setEquipped = useMutation(api.shop.setEquipped);
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (item: InvItem) => {
    setBusy(item.itemKey);
    try {
      await setEquipped({ itemKey: item.equipped ? undefined : item.itemKey });
      toast.success(
        item.equipped ? `${item.name} unequipped` : `${item.name} equipped — your crystal responds`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const auraTint = equippedByCategory?.aura?.tint ?? null;
  const frameTint = equippedByCategory?.frame?.tint ?? null;

  return (
    <GameShell>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One relic per slot. Equipped items reshape your crystal and its chrome.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-12">
          {/* equipment panel: preview + slots */}
          <section className="lg:col-span-4" aria-label="Equipment">
            <div className="surface-hero ring-edge grain rounded-2xl p-5">
              <div className="relative mx-auto h-52 w-full max-w-64">
                <HeroStage
                  form={character ? formForLevel(character.level) : 1}
                  level={character?.level ?? 1}
                  state="idle"
                  tint={auraTint}
                />
              </div>
              <div className="mt-2 text-center">
                <div className="font-display text-lg font-black">{character?.name ?? "..."}</div>
                <div className="text-xs text-muted-foreground">
                  {equippedByCategory?.title?.name
                    ? `Bearing ${equippedByCategory.title.name}`
                    : character?.title}
                </div>
              </div>

              {/* slots */}
              <div className="mt-4 space-y-2">
                {SLOTS.map(({ category, icon: SlotIcon }) => {
                  const eq = equippedByCategory?.[category];
                  return (
                    <div
                      key={category}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${
                        eq ? RARITY_BORDER[eq.rarity] ?? "border-border" : "border-dashed border-border/60"
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

          {/* owned items */}
          <section className="lg:col-span-8" aria-label="Owned items">
            {!items ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="surface-panel ring-edge h-40 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="surface-panel ring-edge flex flex-col items-center gap-3 rounded-2xl py-16 text-center">
                <Backpack className="size-10 text-muted-foreground/40" />
                <h2 className="font-display text-lg font-black tracking-wider">
                  YOUR SATCHEL IS EMPTY
                </h2>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Earn Gold and claim your first relic.
                </p>
                <Link to="/shop">
                  <Button className="glow-violet mt-1 font-bold">
                    <Store className="size-4" /> Visit the Shop
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((item, i) => {
                  const Icon = ICONS[item.icon] ?? Sparkles;
                  return (
                    <motion.article
                      key={item._id}
                      layout
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.35 }}
                      className={`surface-quest ring-edge relative overflow-hidden rounded-xl border ${
                        item.equipped ? RARITY_BORDER[item.rarity] ?? "border-border" : "border-border/50"
                      } ${item.equipped ? "glow-violet" : ""}`}
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
                          <span className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {item.rarity}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                            {CATEGORY_LABEL[item.category] ?? item.category}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 pt-3">
                        <h2 className="font-display text-base font-bold">{item.name}</h2>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {item.description}
                        </p>
                        <Button
                          size="sm"
                          variant={item.equipped ? "outline" : "default"}
                          onClick={() => toggle(item)}
                          disabled={busy !== null}
                          className="mt-3 w-full min-h-9 font-semibold"
                        >
                          {busy === item.itemKey ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : item.equipped ? (
                            "Unequip"
                          ) : (
                            "Equip"
                          )}
                        </Button>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </GameShell>
  );
}
