import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  Flame,
  Leaf,
  Loader2,
  Snowflake,
  Sun,
  Zap,
  Circle,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GameShell from "@/components/GameShell";

const ICONS: Record<string, LucideIcon> = { Flame, Leaf, Snowflake, Sun, Zap };

interface InvItem {
  _id: string;
  itemKey: string;
  equipped: boolean;
  name: string;
  description: string;
  rarity: string;
  tint: string;
  icon: string;
  price: number;
}

export default function Inventory() {
  const items = useQuery(api.shop.listMyInventory) as InvItem[] | null | undefined;
  const setEquipped = useMutation(api.shop.setEquipped);
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (item: InvItem) => {
    setBusy(item.itemKey);
    try {
      await setEquipped({ itemKey: item.equipped ? undefined : item.itemKey });
      toast.success(item.equipped ? `${item.name} unequipped` : `${item.name} equipped — your crystal responds`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <GameShell>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Equipped loot changes the energy tint of your crystal hero. One relic at a time.
          </p>
        </div>

        {!items ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="surface-panel ring-edge h-40 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="surface-panel ring-edge flex flex-col items-center gap-2 rounded-xl py-16 text-center">
            <Circle className="size-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">Your satchel is empty</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Earn Gold from quests, then visit the Shop to claim your first relic.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, i) => {
              const Icon = ICONS[item.icon] ?? Zap;
              return (
                <motion.article
                  key={item._id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35 }}
                  className={`surface-quest ring-edge relative overflow-hidden rounded-xl p-4 ${
                    item.equipped ? "glow-violet" : ""
                  }`}
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
                    {item.equipped ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                        <CheckCircle2 className="size-3.5" /> Equipped
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {item.rarity}
                      </span>
                    )}
                  </div>
                  <h2 className="font-display mt-3 text-base font-bold">{item.name}</h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                  <Button
                    size="sm"
                    variant={item.equipped ? "outline" : "default"}
                    onClick={() => toggle(item)}
                    disabled={busy !== null}
                    className="mt-3 w-full font-semibold"
                  >
                    {busy === item.itemKey ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : item.equipped ? (
                      "Unequip"
                    ) : (
                      "Equip"
                    )}
                  </Button>
                </motion.article>
              );
            })}
          </div>
        )}
      </main>
    </GameShell>
  );
}
