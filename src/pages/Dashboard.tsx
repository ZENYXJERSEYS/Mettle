import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import GameShell from "@/components/GameShell";
import HeroStage from "@/components/hero/HeroStage";
import MoltenXpBar from "@/components/game/MoltenXpBar";
import AttributePanel from "@/components/game/AttributePanel";
import QuestCard from "@/components/game/QuestCard";
import NewQuestComposer from "@/components/game/NewQuestComposer";
import AdventureLog from "@/components/game/AdventureLog";
import TruthfulCompletionModal, {
  type TruthfulStage,
} from "@/components/game/TruthfulCompletionModal";
import { Switch } from "@/components/ui/switch";
import LevelUpModal, { type LevelUpData } from "@/components/game/LevelUpModal";
import RewardFloats, { type RewardPayload } from "@/components/game/RewardFloats";
import { levelFromXp, titleForLevel, CATEGORY_META } from "@/convex/gameRules";
import {
  Coins,
  Flame,
  Gift,
  Loader2,
  Sparkles,
  Swords,
  Trophy,
  Zap,
  Crown,
  Award,
  ShieldCheck,
  type LucideIcon,
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
  const character = useQuery(api.characters.getMyCharacter) as Character | null | undefined;
  const quests = useQuery(api.quests.listMyQuests);
  const activity = useQuery(api.activityLog.listMyActivity, { limit: 30 });
  const equippedByCategory = useQuery(api.shop.getMyEquipped) as
    | Record<
        string,
        {
          key: string;
          name: string;
          tint: string;
          rarity: string;
          category: string;
          titleGrant?: string;
        }
      >
    | null
    | undefined;
  const board = useQuery(api.leaderboard.getLeaderboard) as
    | {
        myRank: number | null;
        total: number;
        myXp: number | null;
        nextRankXp: number | null;
      }
    | null
    | undefined;
  const settings = useQuery(api.settings.getMySettings);
  const setTruthfulModeSetting = useMutation(api.settings.setTruthfulMode);
  const createCharacter = useMutation(api.characters.createCharacter);
  const completeQuest = useMutation(api.quests.completeQuest);
  const deleteQuest = useMutation(api.quests.deleteQuest);
  const grantXp = useMutation(api.characters.grantXp);

  // ensure character exists once authed
  useEffect(() => {
    if (character === null) {
      void createCharacter({});
    }
  }, [character, createCharacter]);

  const [heroState, setHeroState] = useState<HeroState>("idle");
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [justCompletedIds, setJustCompletedIds] = useState<Set<string>>(new Set());
  const [reward, setReward] = useState<RewardPayload | null>(null);
  const [levelUp, setLevelUp] = useState<LevelUpData | null>(null);
  const [hotAttr, setHotAttr] = useState<string | null>(null);
  const [truthful, setTruthful] = useState<{
    questId: string;
    stage: TruthfulStage;
    completionId: string | null;
  } | null>(null);

  const truthfulModeEnabled = settings?.truthfulMode ?? true;

  const lvl = character ? levelFromXp(character.xp) : null;

  const difficultyOrder: Record<string, number> = { epic: 0, hard: 1, medium: 2, easy: 3 };
  const activeQuests = useMemo(
    () => (quests ?? []).filter((q) => q.status === "active"),
    [quests],
  );
  // Today's Mission = highest-difficulty active quest
  const todaysMission = useMemo(() => {
    if (activeQuests.length === 0) return null;
    return [...activeQuests].sort(
      (a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty],
    )[0];
  }, [activeQuests]);

  const handleComplete = async (questId: string, honest?: boolean) => {
    if (completingId) return; // lock against duplicate clicks
    setCompletingId(questId);
    try {
      const result = await completeQuest({ questId: questId as never, honest });
      if (result.alreadyCompleted) return; // idempotent retry — no fabricated rewards
      const r = result.reward!;
      setJustCompletedIds((s) => new Set(s).add(questId));
      setReward({ xp: r.xp, gold: r.gold, attr: r.attr, attrGain: r.attrGain });
      setHotAttr(r.attr);
      setHeroState("pulse");
      if (result.levelUp) {
        setTimeout(() => setLevelUp(result.levelUp!), 1400);
      } else if (honest === true && result.completionId) {
        // offer the reflection step once the reward choreography has played
        setTimeout(
          () =>
            setTruthful({
              questId,
              stage: "reflect",
              completionId: result.completionId ?? null,
            }),
          1250,
        );
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

  // entry point for every Complete control: truthfulness prompt unless disabled
  const requestComplete = (questId: string) => {
    if (completingId) return;
    if (truthfulModeEnabled) {
      setTruthful({ questId, stage: "confirm", completionId: null });
    } else {
      void handleComplete(questId, undefined);
    }
  };

  const handleTruthfulConfirm = (honest: boolean) => {
    if (!truthful) return;
    if (honest) {
      const questId = truthful.questId;
      setTruthful(null); // reveal the reward choreography
      void handleComplete(questId, true);
    } else {
      // "Not yet" — no punishment, no server call, quest stays active
      setTruthful({ ...truthful, stage: "notYet", completionId: null });
    }
  };

  const truthfulQuest = useMemo(
    () => (quests ?? []).find((q) => q._id === truthful?.questId) ?? null,
    [quests, truthful?.questId],
  );

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

  // Hidden demo fixture: Ctrl+Alt+D — grants 120 XP through the real server mutation.
  // Not rendered anywhere in the UI.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        void (async () => {
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
        })();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [grantXp]);

  if (character === undefined) {
    return <GameShell><main className="flex min-h-[60vh] items-center justify-center"><Loader2 className="size-7 animate-spin text-muted-foreground" /></main></GameShell>;
  }
  if (!character) return null;

  const xpNeeded = lvl?.nextLevelXp ?? 100;
  const xpInto = lvl?.xpIntoLevel ?? 0;
  const xpRemaining = Math.max(0, xpNeeded - xpInto);
  const activeCount = activeQuests.length;
  const completedCount = (quests ?? []).filter((q) => q.status === "completed").length;
  // streak milestones: next badge at 7 / 14 / 30
  const milestone = character.streak >= 30 ? null : character.streak >= 14 ? 30 : character.streak >= 7 ? 14 : 7;

  return (
    <GameShell>
      <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-8 sm:py-6">
        <div className="grid gap-5 lg:grid-cols-12">
          {/* ══ LEFT: hero command stage ══ */}
          <section id="character" className="scroll-mt-24 lg:col-span-5" aria-label="Character">
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
                    {equippedByCategory?.title?.titleGrant ?? character.title}
                  </div>
                  {equippedByCategory && (
                    <>
                      {(equippedByCategory.aura ?? equippedByCategory.core) && (
                        <div
                          className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                          style={{
                            background: `${(equippedByCategory.aura ?? equippedByCategory.core)?.tint}1f`,
                            color: (equippedByCategory.aura ?? equippedByCategory.core)?.tint,
                          }}
                        >
                          <Sparkles className="size-3" />
                          {(equippedByCategory.aura ?? equippedByCategory.core)?.name}
                        </div>
                      )}
                      {equippedByCategory.badge && (
                        <div
                          className="ml-1.5 mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                          style={{
                            background: `${equippedByCategory.badge.tint}1f`,
                            color: equippedByCategory.badge.tint,
                          }}
                        >
                          <Award className="size-3" />
                          {equippedByCategory.badge.name}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-display text-gradient-gold text-6xl font-black leading-none">
                    {character.level}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/70">
                    Level
                  </div>
                </div>
              </div>

              {/* 3D hero — tinted by equipped aura/core/skin; frame ring from equipped frame */}
              <div
                className="relative mx-auto h-64 w-full max-w-80 rounded-2xl p-1 sm:h-72"
                style={
                  equippedByCategory?.frame
                    ? {
                        border: `1px solid ${equippedByCategory.frame.tint}55`,
                        boxShadow: `0 0 24px ${equippedByCategory.frame.tint}2e`,
                      }
                    : undefined
                }
              >
                <HeroStage
                  form={character.form}
                  level={character.level}
                  state={heroState}
                  equipped={equippedByCategory}
                />
              </div>

              {/* XP */}
              <div className="relative z-10">
                <MoltenXpBar xpIntoLevel={xpInto} needed={xpNeeded} level={character.level} />
                <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground/70 italic">
                  XP is a token of commitment, not a measurement of intelligence,
                  knowledge, health, or personal worth.
                </p>
              </div>

              {/* mini stats */}
              <div className="relative z-10 mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-secondary/40 py-2">
                  <div className="font-mono text-lg font-bold">{activeCount}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Active</div>
                </div>
                <div className="rounded-lg bg-secondary/40 py-2">
                  <div className="font-mono text-lg font-bold">{completedCount}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Done</div>
                </div>
                <div className="rounded-lg bg-secondary/40 py-2">
                  <div className="font-mono text-lg font-bold">{character.streak}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Streak</div>
                </div>
              </div>
            </motion.div>

            {/* attributes */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.45 }}
              className="surface-panel ring-edge mt-4 rounded-2xl p-4"
              aria-label="Attributes"
            >
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Attributes
              </h2>
              <AttributePanel character={character} highlightAttr={hotAttr} highlightGain={reward?.attrGain} />
            </motion.div>
          </section>

          {/* ══ RIGHT: mission + quests + previews ══ */}
          <div className="flex flex-col gap-5 lg:col-span-7">
            {/* TODAY'S MISSION — privileged */}
            {todaysMission ? (
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.45 }}
                aria-label="Today's Mission"
                className="ring-edge relative overflow-hidden rounded-2xl p-[1.5px]"
                style={{ background: `linear-gradient(120deg, oklch(from var(--attr-${todaysMission.category}) 60% c h / 65%), oklch(0.68 0.19 295 / 45%))` }}
              >
                <div className="surface-quest grain relative rounded-2xl p-4 sm:p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/70">
                      Today's Mission
                    </span>
                    <span
                      className="font-mono text-xs"
                      style={{ color: `var(--attr-${todaysMission.category})` }}
                    >
                      {CATEGORY_META[todaysMission.category]?.label} · {todaysMission.difficulty}
                    </span>
                  </div>
                  <h2 className="font-display text-xl font-bold leading-snug sm:text-2xl">
                    {todaysMission.title}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-sm">
                    <span className="text-gold">+{todaysMission.xpReward} XP</span>
                    <span className="text-gold/70">+{todaysMission.goldReward} Gold</span>
                    <span style={{ color: `var(--attr-${todaysMission.category})` }}>
                      +{CATEGORY_META[todaysMission.category]?.attr} gain
                    </span>
                  </div>
                  <button
                    onClick={() => requestComplete(todaysMission._id)}
                    disabled={completingId !== null}
                    className="glow-violet mt-4 w-full rounded-xl bg-primary py-3 font-display text-base font-black uppercase tracking-widest text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
                  >
                    {completingId === todaysMission._id ? (
                      <Loader2 className="mx-auto size-5 animate-spin" />
                    ) : (
                      "Complete Quest"
                    )}
                  </button>
                </div>
              </motion.section>
            ) : (
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                aria-label="New quest"
                className="surface-panel ring-edge rounded-2xl p-4 sm:p-5"
              >
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Accept a new quest
                </h2>
                <NewQuestComposer />
              </motion.section>
            )}

            {/* composer (when mission shown) */}
            {todaysMission && (
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.45 }}
                className="surface-panel ring-edge rounded-2xl p-4 sm:p-5"
                aria-label="New quest"
              >
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Accept another quest
                </h2>
                <NewQuestComposer />
              </motion.section>
            )}

            {/* preview rail: next reward + streak milestone + rank */}
            <div className="grid gap-4 sm:grid-cols-3">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="surface-panel ring-edge rounded-xl p-3.5"
              >
                <Gift className="mb-2 size-4.5 text-gold" />
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Next reward</div>
                <div className="font-display mt-1 text-xl font-black text-gradient-gold">
                  LV {character.level + 1}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {xpRemaining} XP away
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, duration: 0.4 }}
                className="surface-panel ring-edge rounded-xl p-3.5"
              >
                <Flame className="mb-2 size-4.5 text-gold" />
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Streak milestone</div>
                {milestone ? (
                  <>
                    <div className="font-display mt-1 text-xl font-black">{milestone} days</div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {milestone - character.streak} to go
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-display mt-1 text-xl font-black text-gradient-gold">Maxed</div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">legend status</div>
                  </>
                )}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.4 }}
                className="surface-panel ring-edge rounded-xl p-3.5"
              >
                <Crown className="mb-2 size-4.5 text-gold" />
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rank</div>
                {board ? (
                  <>
                    <div className="font-display mt-1 text-xl font-black">
                      {board.myRank !== null ? `#${board.myRank}` : "--"}
                    </div>
                    <Link to="/leaderboard" className="mt-0.5 inline-block font-mono text-[11px] text-primary hover:underline">
                      of {board.total} heroes — view
                    </Link>
                  </>
                ) : (
                  <div className="mt-2 h-5 animate-pulse rounded bg-muted" />
                )}
              </motion.div>
            </div>

            {/* quest board */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.45 }}
              aria-label="Quests"
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Quest Board
                </h2>
                <span className="font-mono text-[11px] text-muted-foreground/60">{activeCount} active</span>
              </div>
              {!quests ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="surface-quest ring-edge h-[74px] animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : (quests ?? []).length === 0 ? (
                <div className="surface-quest ring-edge flex flex-col items-center gap-3 rounded-xl py-12 text-center">
                  <Swords className="size-8 text-muted-foreground/40" />
                  <h3 className="font-display text-base font-black tracking-widest">
                    THE QUEST BOARD IS SILENT
                  </h3>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Every legend begins with one mission.
                  </p>
                  <button
                    onClick={() => document.getElementById("quest-input")?.focus()}
                    className="glow-violet mt-1 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-95"
                  >
                    CREATE YOUR FIRST QUEST
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {(quests ?? []).map((q) => (
                      <QuestCard
                        key={q._id}
                        quest={q}
                        completing={completingId === q._id}
                        justCompleted={justCompletedIds.has(q._id)}
                        onComplete={() => requestComplete(q._id)}
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
              className="scroll-mt-24"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36, duration: 0.45 }}
            >
              <AdventureLog entries={activity ?? undefined} />
            </motion.div>

            {/* truthful mode setting */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.45 }}
              aria-label="Settings"
              className="surface-panel ring-edge rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <ShieldCheck className="size-4 text-primary" />
                    Truthful completions
                  </h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    Mettle trusts you to report your real progress. Rewards are tokens
                    that encourage consistency, not proof of your worth.
                  </p>
                </div>
                <Switch
                  checked={truthfulModeEnabled}
                  onCheckedChange={(v) => void setTruthfulModeSetting({ enabled: v })}
                  aria-label="Enable truthful completions"
                />
              </div>
            </motion.section>
          </div>
        </div>
      </main>

      {/* overlays */}
      <RewardFloats reward={reward} onDone={() => setReward(null)} />
      <LevelUpModal data={levelUp} onClose={() => setLevelUp(null)} />
      <TruthfulCompletionModal
        quest={truthfulQuest}
        stage={truthful?.stage ?? null}
        completionId={truthful?.completionId ?? null}
        onClose={() => setTruthful(null)}
        onConfirm={handleTruthfulConfirm}
      />
    </GameShell>
  );
}
