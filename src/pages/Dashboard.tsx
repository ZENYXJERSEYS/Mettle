import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import HeroStage from "@/components/hero/HeroStage";
import MoltenXpBar from "@/components/game/MoltenXpBar";
import AttributePanel from "@/components/game/AttributePanel";
import QuestCard from "@/components/game/QuestCard";
import NewQuestComposer from "@/components/game/NewQuestComposer";
import AdventureLog from "@/components/game/AdventureLog";
import LevelUpModal, { type LevelUpData } from "@/components/game/LevelUpModal";
import RewardFloats, { type RewardPayload } from "@/components/game/RewardFloats";
import {
  levelFromXp,
  titleForLevel,
  CATEGORY_META,
} from "@/convex/gameRules";
import {
  Coins,
  Flame,
  Loader2,
  LogOut,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react";

type HeroState = "idle" | "pulse" | "levelup";

interface Character {
  _id: string;
  name: string;
  title: string;
  level: number;
  xp: number;
  gold: number;
  streak: number;
  form: number;
  strength: number;
  intellect: number;
  wisdom: number;
  discipline: number;
  vitality: number;
  creativity: number;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const character = useQuery(api.characters.getMyCharacter) as Character | null | undefined;
  const quests = useQuery(api.quests.listMyQuests);
  const activity = useQuery(api.activityLog.listMyActivity, { limit: 30 });
  const createCharacter = useMutation(api.characters.createCharacter);
  const completeQuest = useMutation(api.quests.completeQuest);
  const deleteQuest = useMutation(api.quests.deleteQuest);
  const grantXp = useMutation(api.characters.grantXp);

  // ensure character exists once authed
  useEffect(() => {
    if (user && character === null) {
      void createCharacter({});
    }
  }, [user, character, createCharacter]);

  const [heroState, setHeroState] = useState<HeroState>("idle");
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [justCompletedIds, setJustCompletedIds] = useState<Set<string>>(new Set());
  const [reward, setReward] = useState<RewardPayload | null>(null);
  const [levelUp, setLevelUp] = useState<LevelUpData | null>(null);
  const [hotAttr, setHotAttr] = useState<string | null>(null);

  const lvl = character ? levelFromXp(character.xp) : null;

  // recommended quest: first active, prefer epic>hard>medium>easy
  const difficultyOrder: Record<string, number> = { epic: 0, hard: 1, medium: 2, easy: 3 };
  const nextQuest = useMemo(() => {
    if (!quests) return null;
    const active = quests.filter((q) => q.status === "active");
    if (active.length === 0) return null;
    return [...active].sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty])[0];
  }, [quests]);

  const handleComplete = async (questId: string) => {
    if (completingId) return; // lock against duplicate clicks
    setCompletingId(questId);
    try {
      const result = await completeQuest({ questId: questId as never });
      if (result.alreadyCompleted) {
        // idempotent retry — no fabricated rewards
        return;
      }
      const r = result.reward!;
      setJustCompletedIds((s) => new Set(s).add(questId));
      setReward({ xp: r.xp, gold: r.gold, attr: r.attr, attrGain: r.attrGain });
      setHotAttr(r.attr);
      setHeroState("pulse");
      if (result.levelUp) {
        setTimeout(() => {
          setLevelUp(result.levelUp!);
        }, 1400);
      }
      setTimeout(() => setHeroState("idle"), 1250);
      setTimeout(() => setHotAttr(null), 2200);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Could not complete quest");
    } finally {
      setCompletingId(null);
    }
  };

  const handleDelete = async (questId: string) => {
    try {
      await deleteQuest({ questId: questId as never });
      setJustCompletedIds((s) => {
        const n = new Set(s);
        n.delete(questId);
        return n;
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  const handleGrantXp = async () => {
    try {
      const res = await grantXp({ amount: 120 });
      if (res.leveledUp && res.levelUp) {
        setHeroState("levelup");
        setLevelUp(res.levelUp);
        setTimeout(() => setHeroState("idle"), 2700);
      } else {
        toast.success("Gained 120 XP");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  if (character === undefined || (user && character === null)) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!character) return null;

  const xpNeeded = lvl?.nextLevelXp ?? 100;
  const completedToday = quests?.filter(
    (q) => q.status === "completed" && q.completedAt && Date.now() - q.completedAt < 86400000
  ).length ?? 0;

  return (
    <div className="min-h-screen pb-24 sm:pb-10">
      {/* ── top bar ── */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <Swords className="size-4 text-primary" />
            </div>
            <span className="font-display hidden text-base font-bold tracking-wide sm:block">
              LIFE<span className="text-primary">RPG</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span aria-label="Gold" className="glow-gold flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1.5 font-mono text-sm font-bold text-gold">
              <Coins className="size-4" />
              {character.gold.toLocaleString()}
            </span>
            <span aria-label="Streak" className="flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1.5 font-mono text-sm font-bold text-foreground/90" title="Daily streak — complete a quest today to keep it">
              <Flame className="size-4 text-gold" />
              {character.streak}
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out" className="text-muted-foreground">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
        <div className="grid gap-5 lg:grid-cols-12">
          {/* ══ LEFT: hero command stage ══ */}
          <section id="character" className="scroll-mt-20 lg:col-span-5" aria-label="Character">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="surface-hero ring-edge grain relative overflow-hidden rounded-2xl p-5"
            >
              {/* identity row */}
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/70">
                    Character
                  </div>
                  <h1 className="font-display mt-1 text-2xl font-black leading-tight">
                    {character.name}
                  </h1>
                  <div className="text-gradient-violet font-display text-sm font-bold tracking-wide">
                    {character.title}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-5xl font-black leading-none text-gradient-gold">
                    {character.level}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/70">
                    Level
                  </div>
                </div>
              </div>

              {/* 3D hero */}
              <div className="relative mx-auto h-56 w-full max-w-72 sm:h-64">
                <HeroStage form={character.form} level={character.level} state={heroState} />
              </div>

              {/* XP */}
              <div className="relative z-10">
                <MoltenXpBar
                  xpIntoLevel={lvl?.xpIntoLevel ?? 0}
                  needed={xpNeeded}
                  level={character.level}
                />
              </div>

              {/* mini stats */}
              <div className="relative z-10 mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-secondary/40 py-2">
                  <div className="font-mono text-lg font-bold">{completedToday}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Today</div>
                </div>
                <div className="rounded-lg bg-secondary/40 py-2">
                  <div className="font-mono text-lg font-bold">{character.streak}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Streak</div>
                </div>
                <div className="rounded-lg bg-secondary/40 py-2">
                  <div className="font-mono text-lg font-bold">{quests?.filter((q) => q.status === "active").length ?? 0}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Active</div>
                </div>
              </div>

              {/* dev fixture (demo level-up trigger) */}
              <button
                onClick={handleGrantXp}
                className="relative z-10 mt-3 w-full rounded-lg border border-dashed border-primary/30 bg-primary/5 py-1.5 text-[11px] font-semibold text-primary/70 transition hover:bg-primary/10"
                title="Development fixture: grants 120 XP to demo the level-up sequence"
              >
                <Zap className="mr-1 inline size-3" />
                +120 XP (demo)
              </button>
            </motion.div>
          </section>

          {/* ══ RIGHT: quests + log ══ */}
          <div className="flex flex-col gap-5 lg:col-span-7">
            {/* next quest — privileged */}
            {nextQuest && (
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.45 }}
                aria-label="Next quest"
                className="ring-edge relative overflow-hidden rounded-2xl p-[1px]"
                style={{ background: `linear-gradient(120deg, oklch(from var(--attr-${nextQuest.category}) 60% c h / 55%), oklch(0.68 0.19 295 / 40%))` }}
              >
                <div className="surface-quest grain relative rounded-2xl p-4 sm:p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/70">
                      ⚡ Next Quest
                    </span>
                    <span className="font-mono text-xs" style={{ color: `var(--attr-${nextQuest.category})` }}>
                      {CATEGORY_META[nextQuest.category]?.label} · {nextQuest.difficulty}
                    </span>
                  </div>
                  <h2 className="font-display text-lg font-bold leading-snug sm:text-xl">{nextQuest.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-sm">
                    <span className="text-gold">+{nextQuest.xpReward} XP</span>
                    <span className="text-gold/60">+{nextQuest.goldReward} G</span>
                    <span style={{ color: `var(--attr-${nextQuest.category})` }}>
                      +{nextQuest.category ? CATEGORY_META[nextQuest.category]?.attr : ""} gain
                    </span>
                  </div>
                  <Button
                    onClick={() => handleComplete(nextQuest._id)}
                    disabled={completingId !== null}
                    className="glow-violet mt-4 w-full font-bold"
                    size="lg"
                  >
                    {completingId === nextQuest._id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4.5" />
                    )}
                    Complete Quest
                  </Button>
                </div>
              </motion.section>
            )}

            {/* composer */}
            <motion.section
              id="quests"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.45 }}
              className="surface-panel ring-edge scroll-mt-20 rounded-2xl p-4 sm:p-5"
              aria-label="New quest"
            >
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Accept a new quest
              </h2>
              <NewQuestComposer />
            </motion.section>

            {/* quest list */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.45 }}
              aria-label="Quests"
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Quest Board
                </h2>
                <span className="font-mono text-[11px] text-muted-foreground/60">
                  {quests?.filter((q) => q.status === "active").length ?? 0} active
                </span>
              </div>
              {!quests ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="surface-quest ring-edge h-[74px] animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : quests.length === 0 ? (
                <div className="surface-quest ring-edge flex flex-col items-center gap-2 rounded-xl py-10 text-center">
                  <Swords className="size-7 text-muted-foreground/40" />
                  <p className="text-sm font-medium">No quests yet</p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    Accept your first real-world quest above. Completing it earns XP, Gold, and attributes.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {quests.map((q) => (
                      <QuestCard
                        key={q._id}
                        quest={q}
                        completing={completingId === q._id}
                        justCompleted={justCompletedIds.has(q._id)}
                        onComplete={() => handleComplete(q._id)}
                        onDelete={() => handleDelete(q._id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.section>

            {/* adventure log */}
            <motion.div
              id="log"
              className="scroll-mt-20"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.45 }}
            >
              <AdventureLog entries={activity ?? undefined} />
            </motion.div>
          </div>
        </div>
      </main>

      {/* overlays */}
      <RewardFloats reward={reward} onDone={() => setReward(null)} />
      <LevelUpModal data={levelUp} onClose={() => setLevelUp(null)} />

      {/* ── mobile bottom nav ── */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/50 bg-background/85 backdrop-blur-md sm:hidden" aria-label="Primary">
        <div className="grid grid-cols-3">
          <a href="#character" className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold text-muted-foreground">
            <Swords className="size-4.5 text-primary" />
            Character
          </a>
          <a href="#quests" className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold text-muted-foreground">
            <Flame className="size-4.5" />
            Quests
          </a>
          <a href="#log" className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold text-muted-foreground">
            <Sparkles className="size-4.5" />
            Log
          </a>
        </div>
      </nav>
    </div>
  );
}
