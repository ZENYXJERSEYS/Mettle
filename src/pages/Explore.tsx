import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Check,
  Compass,
  Flame,
  Loader2,
  Swords,
  UserPlus,
  Users,
} from "lucide-react";
import GameShell from "@/components/GameShell";
import { toast } from "sonner";

interface Hero {
  key: string;
  name: string;
  displayName?: string;
  pronouns?: string;
  bio?: string;
  level: number;
  xp: number;
  streak: number;
  title: string;
  form: number;
  interests?: string[];
}

interface FriendRequest {
  requestId: string;
  fromKey: string;
  name: string;
  level: number;
  title: string;
  createdAt: number;
}

type FriendState = "friends" | "pending" | "none";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function HeroCard({
  hero,
  state,
  busy,
  onAdd,
}: {
  hero: Hero;
  state: FriendState;
  busy: boolean;
  onAdd: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="surface-quest ring-edge flex flex-col gap-3 rounded-xl p-4 transition-colors hover:bg-secondary/40"
    >
      <div className="flex items-center gap-3">
        <div className="font-display flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-sm font-black text-primary ring-1 ring-primary/30">
          {initials(hero.displayName || hero.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-semibold">{hero.displayName || hero.name}</span>
            <span className="truncate text-xs text-muted-foreground">{hero.name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">LV {hero.level}</span>
            <span>·</span>
            <span className="truncate">{hero.title}</span>
            <span>·</span>
            <span className="flex items-center gap-0.5 font-mono">
              <Flame className="size-3 text-gold" />
              {hero.streak}d
            </span>
          </div>
        </div>
      </div>

      {hero.bio && (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{hero.bio}</p>
      )}

      {hero.interests && hero.interests.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {hero.interests.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2">
        <a
          href={`/hero/${hero.key}`}
          className="text-xs font-semibold text-primary hover:underline"
        >
          View profile
        </a>
        {state === "friends" ? (
          <span className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary ring-1 ring-primary/25">
            <Check className="size-3.5" />
            Allies
          </span>
        ) : state === "pending" ? (
          <span className="rounded-lg bg-secondary/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground ring-1 ring-border/60">
            Requested
          </span>
        ) : (
          <button
            onClick={onAdd}
            disabled={busy}
            className="glow-violet flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-transform active:scale-95 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <UserPlus className="size-3.5" />
            )}
            Add ally
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function Explore() {
  const roster = useQuery(api.social.getExploreRoster) as
    | { heroes: Hero[] }
    | null
    | undefined;
  const friends = useQuery(api.social.listMyFriends) as Hero[] | undefined;
  const incoming = useQuery(api.social.listMyFriendRequests) as
    | FriendRequest[]
    | undefined;
  const outgoing = useQuery(api.social.listMyOutgoingRequests) as
    | { toKey: string; createdAt: number }[]
    | undefined;

  const sendRequest = useMutation(api.social.sendFriendRequest);
  const respond = useMutation(api.social.respondToFriendRequest);

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [handledIds, setHandledIds] = useState<Set<string>>(new Set());

  const friendKeys = new Set((friends ?? []).map((f) => f.key));
  const pendingKeys = new Set((outgoing ?? []).map((o) => o.toKey));

  const stateFor = (key: string): FriendState =>
    friendKeys.has(key) ? "friends" : pendingKeys.has(key) ? "pending" : "none";

  const handleAdd = async (key: string) => {
    if (busyKey) return;
    setBusyKey(key);
    try {
      const res = (await sendRequest({ toUserKey: key })) as {
        ok: boolean;
        accepted?: boolean;
      };
      toast.success(
        res.accepted
          ? "You are now allies — they had already asked you."
          : "Ally request sent.",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not send that request.",
      );
    } finally {
      setBusyKey(null);
    }
  };

  const handleRespond = async (requestId: string, accept: boolean) => {
    try {
      await respond({ requestId: requestId as never, accept });
      setHandledIds((prev) => new Set(prev).add(requestId));
      toast.success(accept ? "Ally added." : "Request declined.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not respond to that request.",
      );
    }
  };

  const visibleIncoming = (incoming ?? []).filter((r) => !handledIds.has(r.requestId));

  return (
    <GameShell>
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-6 text-center">
          <Compass className="mx-auto mb-2 size-8 text-primary" />
          <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Explore</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Heroes training in the real world, ranked by earned XP
          </p>
        </div>

        {/* incoming ally requests */}
        {incoming !== undefined && visibleIncoming.length > 0 && (
          <section aria-label="Ally requests" className="mb-6">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Users className="size-4 text-primary" />
              Ally requests
            </h2>
            <div className="space-y-2">
              {visibleIncoming.map((r) => (
                <motion.div
                  key={r.requestId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="surface-panel ring-edge flex flex-wrap items-center gap-3 rounded-xl px-4 py-3"
                >
                  <div className="font-display flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/60 text-xs font-black">
                    {initials(r.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      LV {r.level} · {r.title}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespond(r.requestId, true)}
                      className="glow-violet rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-transform active:scale-95"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespond(r.requestId, false)}
                      className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs font-semibold transition hover:bg-secondary/70"
                    >
                      Decline
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* roster */}
        {!roster ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="surface-quest ring-edge h-32 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : roster.heroes.length === 0 ? (
          <div className="surface-panel ring-edge flex flex-col items-center gap-3 rounded-xl py-14 text-center">
            <Swords className="size-8 text-muted-foreground/40" />
            <h3 className="font-display text-base font-black tracking-widest">NO OTHER HEROES YET</h3>
            <p className="max-w-xs text-sm text-muted-foreground">
              Be the first to build a public profile — then recruit allies from here.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {roster.heroes.map((h) => (
              <HeroCard
                key={h.key}
                hero={h}
                state={stateFor(h.key)}
                busy={busyKey === h.key}
                onAdd={() => handleAdd(h.key)}
              />
            ))}
          </div>
        )}
      </main>
    </GameShell>
  );
}
