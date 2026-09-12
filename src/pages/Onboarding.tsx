import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  Code2,
  Dumbbell,
  FlaskConical,
  Globe2,
  HeartPulse,
  Languages,
  Loader2,
  Music,
  Palette,
  PenLine,
  Shield,
  Sparkles,
  Store,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import HeroStage from "@/components/hero/HeroStage";
import type { HeroState } from "src/components/hero/HeroCrystal";
import { CATEGORY_META, DIFFICULTY_META, DIFFICULTIES, type Difficulty } from "@/convex/gameRules";
import { ATTRS } from "@/convex/gameRules";

/* ── static data ─────────────────────────────────────────────────────────── */

const INTERESTS = [
  { key: "Coding", icon: Code2, hue: "var(--attr-intellect)" },
  { key: "Mathematics", icon: FlaskConical, hue: "var(--attr-intellect)" },
  { key: "Reading", icon: BookOpen, hue: "var(--attr-wisdom)" },
  { key: "Fitness", icon: Dumbbell, hue: "var(--attr-strength)" },
  { key: "Running", icon: HeartPulse, hue: "var(--attr-vitality)" },
  { key: "Writing", icon: PenLine, hue: "var(--attr-creativity)" },
  { key: "Art", icon: Palette, hue: "var(--attr-creativity)" },
  { key: "Music", icon: Music, hue: "var(--attr-creativity)" },
  { key: "Meditation", icon: Shield, hue: "var(--attr-discipline)" },
  { key: "Business", icon: Store, hue: "var(--attr-wisdom)" },
  { key: "Design", icon: Palette, hue: "var(--attr-creativity)" },
  { key: "Science", icon: FlaskConical, hue: "var(--attr-intellect)" },
  { key: "Languages", icon: Languages, hue: "var(--attr-wisdom)" },
  { key: "Health", icon: HeartPulse, hue: "var(--attr-vitality)" },
  { key: "Gaming", icon: Target, hue: "var(--attr-discipline)" },
  { key: "Building", icon: Code2, hue: "var(--attr-creativity)" },
  { key: "Learning", icon: Brain, hue: "var(--attr-intellect)" },
  { key: "Entrepreneurship", icon: Store, hue: "var(--attr-wisdom)" },
] as const;

const MOTIVATIONS = [
  "Build better habits",
  "Learn a valuable skill",
  "Get healthier",
  "Become more disciplined",
  "Finish personal projects",
  "Stay accountable",
  "Become more confident",
  "Make progress with friends",
] as const;

const QUEST_TEMPLATES = [
  { title: "Study for 25 minutes", category: "studying", difficulty: "medium" },
  { title: "Read 10 pages", category: "reading", difficulty: "easy" },
  { title: "Take a 20-minute walk", category: "sport", difficulty: "easy" },
  { title: "Write 300 words", category: "writing", difficulty: "easy" },
  { title: "Complete one coding task", category: "coding", difficulty: "medium" },
  { title: "Meditate for 10 minutes", category: "habits", difficulty: "easy" },
  { title: "Clean one area", category: "habits", difficulty: "easy" },
  { title: "Practice a skill", category: "studying", difficulty: "medium" },
] as const;

const STEP_TITLES = [
  "WELCOME TO METTLE",
  "WHO ARE YOU BECOMING?",
  "WHAT ARE YOU BUILDING?",
  "WHAT DRAWS YOU?",
  "WHICH ATTRIBUTES ARE YOU HERE TO FORGE?",
  "WHAT BROUGHT YOU HERE?",
  "YOUR FIRST QUEST",
] as const;

const PRONOUN_OPTIONS = ["she/her", "he/him", "they/them", "she/they", "he/they", "xe/xem"] as const;

/* ── component ───────────────────────────────────────────────────────────── */

export default function Onboarding() {
  const navigate = useNavigate();
  const character = useQuery(api.characters.getMyCharacter);
  const createCharacter = useMutation(api.characters.createCharacter);
  const finalize = useMutation(api.characters.finalizeOnboarding);
  const createQuest = useMutation(api.quests.createQuest);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [forging, setForging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [characterName, setCharacterName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [focusAttrs, setFocusAttrs] = useState<string[]>([]);
  const [motivations, setMotivations] = useState<string[]>([]);
  const [questChoice, setQuestChoice] = useState<string>(QUEST_TEMPLATES[0].title);
  const [customQuest, setCustomQuest] = useState("");

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );

  // ensure a character row exists once authed
  useEffect(() => {
    if (character === null) void createCharacter({});
  }, [character, createCharacter]);

  // skip if already onboarded
  useEffect(() => {
    if (character?.onboardingComplete) navigate("/dashboard", { replace: true });
  }, [character?.onboardingComplete, navigate]);

  const chosenQuestTitle = questChoice === "__custom" ? customQuest.trim() : questChoice;

  const canAdvance = () => {
    switch (step) {
      case 1:
        return characterName.trim().length >= 2;
      case 2:
        return bio.trim().length > 0 && bio.length <= 160;
      case 3:
        return interests.length > 0;
      case 4:
        return focusAttrs.length >= 1 && focusAttrs.length <= 3;
      case 5:
        return motivations.length > 0;
      case 6:
        return chosenQuestTitle.length >= 3;
      default:
        return true;
    }
  };

  const toggle = (
    list: string[],
    setList: (v: string[]) => void,
    key: string,
    max?: number,
  ) => {
    if (list.includes(key)) setList(list.filter((k) => k !== key));
    else if (!max || list.length < max) setList([...list, key]);
  };

  const forge = async () => {
    setSaving(true);
    setError(null);
    try {
      await finalize({
        characterName,
        displayName: displayName || undefined,
        pronouns: pronouns || undefined,
        bio,
        interests,
        focusAttrs,
        motivations,
        timezone,
      });
      // create the first quest through the real server mutation
      const meta = CATEGORY_META;
      const catKey = QUEST_TEMPLATES.find((t) => t.title === questChoice)?.category;
      const category = questChoice === "__custom" ? "studying" : (catKey ?? "studying");
      const difficulty: Difficulty =
        (QUEST_TEMPLATES.find((t) => t.title === questChoice)?.difficulty as Difficulty) ?? "medium";
      await createQuest({
        title: chosenQuestTitle,
        category: category in meta ? category : "studying",
        difficulty,
      });
      setForging(true); // ceremony
      setTimeout(() => navigate("/dashboard", { replace: true }), 3400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The forging ritual failed");
      setSaving(false);
    }
  };

  /* ── forging ceremony ── */
  if (forging) {
    return <ForgingCeremony characterName={characterName || "Hero"} />;
  }

  const steps = [
    /* 0 — welcome */
    <div key="welcome" className="text-center">
      <div className="mx-auto h-44 w-44 sm:h-52 sm:w-52">
        <HeroStage form={1} level={1} state="idle" />
      </div>
      <h1 className="font-display mt-2 text-3xl font-black tracking-[0.12em] sm:text-4xl">
        WELCOME TO METTLE
      </h1>
      <p className="mt-3 text-sm text-muted-foreground sm:text-base">
        Your real life is the progression system.
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Build a character that reflects the person you are becoming.
      </p>
    </div>,

    /* 1 — identity */
    <div key="identity" className="space-y-4">
      <div>
        <label htmlFor="charname" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Character name
        </label>
        <p className="mb-1.5 text-xs text-muted-foreground/70">The name on your profile and quest history.</p>
        <input
          id="charname"
          value={characterName}
          onChange={(e) => setCharacterName(e.target.value)}
          maxLength={24}
          placeholder="Arin"
          className="w-full rounded-xl border border-input bg-secondary/30 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>
      <div>
        <label htmlFor="dispname" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Display name
        </label>
        <p className="mb-1.5 text-xs text-muted-foreground/70">How other heroes see you.</p>
        <input
          id="dispname"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={32}
          placeholder="Optional"
          className="w-full rounded-xl border border-input bg-secondary/30 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pronouns</span>
        <p className="mb-1.5 text-xs text-muted-foreground/70">Optional. Choose what feels right for you.</p>
        <div className="flex flex-wrap gap-1.5">
          {PRONOUN_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPronouns(pronouns === p ? "" : p)}
              aria-pressed={pronouns === p}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                pronouns === p
                  ? "bg-primary/15 text-primary ring-primary/40"
                  : "ring-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-center pt-2">
        <div className="h-24 w-24">
          <HeroStage form={1} level={1} state="idle" />
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground/60">
        Live preview — your crystal evolves with you.
      </p>
    </div>,

    /* 2 — bio */
    <div key="bio">
      <label htmlFor="bio" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        What are you building?
      </label>
      <p className="mb-1.5 text-xs text-muted-foreground/70">
        Tell other heroes what you are working toward.
      </p>
      <textarea
        id="bio"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        maxLength={160}
        rows={4}
        placeholder="Learning to code, becoming healthier, and building things I'm proud of."
        className="w-full resize-none rounded-xl border border-input bg-secondary/30 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      />
      <div className="mt-1 text-right font-mono text-[11px] text-muted-foreground/60">
        {bio.length} / 160
      </div>
    </div>,

    /* 3 — interests */
    <div key="interests">
      <p className="mb-3 text-xs text-muted-foreground">Pick a few — they shape your recommendations.</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Interests">
        {INTERESTS.map(({ key, icon: Icon, hue }) => {
          const on = interests.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(interests, setInterests, key, 8)}
              aria-pressed={on}
              className="flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all"
              style={{
                borderColor: on ? hue : "oklch(0.98 0.01 270 / 9%)",
                background: on ? `oklch(from ${hue} 60% c h / 12%)` : "oklch(1 0 0 / 3%)",
                color: on ? hue : undefined,
                boxShadow: on ? `0 0 14px oklch(from ${hue} 60% c h / 25%)` : undefined,
              }}
            >
              <Icon className="size-4" style={{ color: on ? hue : "var(--muted-foreground)" }} />
              {key}
              {on && <Check className="size-3.5" />}
            </button>
          );
        })}
      </div>
    </div>,

    /* 4 — growth paths */
    <div key="paths">
      <p className="mb-1.5 text-xs text-muted-foreground">
        You can develop every attribute. Choose the ones you want to focus on first.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ATTRS.map((a) => {
          const on = focusAttrs.includes(a);
          const hue = `var(--attr-${a})`;
          return (
            <button
              key={a}
              type="button"
              onClick={() => toggle(focusAttrs, setFocusAttrs, a, 3)}
              aria-pressed={on}
              className="rounded-xl border p-3 text-left transition-all"
              style={{
                borderColor: on ? hue : "oklch(0.98 0.01 270 / 9%)",
                background: on ? `oklch(from ${hue} 60% c h / 10%)` : "oklch(1 0 0 / 3%)",
              }}
            >
              <div className="text-sm font-bold capitalize" style={{ color: on ? hue : undefined }}>
                {a}
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                {CATEGORY_META[a]?.label ?? a}
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground/70">
        {focusAttrs.length} of 3 selected
      </p>
    </div>,

    /* 5 — motivation */
    <div key="motivation">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Motivations">
        {MOTIVATIONS.map((m) => {
          const on = motivations.includes(m);
          return (
            <button
              key={m}
              type="button"
              onClick={() => toggle(motivations, setMotivations, m)}
              aria-pressed={on}
              className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all ${
                on
                  ? "border-primary/50 bg-primary/12 text-primary"
                  : "border-border/60 bg-secondary/25 text-muted-foreground hover:text-foreground"
              }`}
            >
              {on && <Check className="mr-1.5 inline size-3.5" />}
              {m}
            </button>
          );
        })}
      </div>
    </div>,

    /* 6 — first quest */
    <div key="quest" className="space-y-3">
      <div className="space-y-1.5">
        {QUEST_TEMPLATES.map((t) => {
          const on = questChoice === t.title;
          const meta = CATEGORY_META[t.category] ?? CATEGORY_META.studying;
          const dm = DIFFICULTY_META[t.difficulty as Difficulty];
          return (
            <button
              key={t.title}
              type="button"
              onClick={() => setQuestChoice(t.title)}
              aria-pressed={on}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition ${
                on ? "border-primary/50 bg-primary/10" : "border-border/60 hover:bg-secondary/40"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: `var(--attr-${meta.attr})` }} />
                {t.title}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {dm.label} · +{dm.xp} XP
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setQuestChoice("__custom")}
          aria-pressed={questChoice === "__custom"}
          className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition ${
            questChoice === "__custom"
              ? "border-primary/50 bg-primary/10"
              : "border-border/60 hover:bg-secondary/40"
          }`}
        >
          Write my own
          <PenLine className="size-4 text-muted-foreground" />
        </button>
        {questChoice === "__custom" && (
          <input
            value={customQuest}
            onChange={(e) => setCustomQuest(e.target.value)}
            maxLength={80}
            placeholder="One small thing you can complete today..."
            autoFocus
            className="w-full rounded-xl border border-input bg-secondary/30 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        )}
      </div>
      <div className="rounded-xl bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <span className="font-bold text-foreground/80">Honest check-in.</span> You confirm
        completion truthfully. Mettle records your commitment and rewards consistency.
      </div>
    </div>,
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[50vh]"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 0%, oklch(0.68 0.19 295 / 14%), transparent 65%)",
        }}
      />
      <main className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-8">
        {/* progress */}
        <div className="mb-6 flex items-center gap-1.5" aria-label={`Step ${step + 1} of 7`}>
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-secondary"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1"
          >
            <h2 className="font-display text-center text-lg font-black tracking-[0.14em] text-primary/90">
              {STEP_TITLES[step]}
            </h2>
            <div className="mt-6">{steps[step]}</div>
          </motion.div>
        </AnimatePresence>

        {error && (
          <p className="mt-4 text-center text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {/* controls */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || saving}
          >
            <ArrowLeft className="size-4" /> Back
          </Button>
          {step < 6 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance() || saving}
              className="glow-violet font-bold"
            >
              Continue <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              onClick={() => void forge()}
              disabled={!canAdvance() || saving}
              className="glow-violet font-black tracking-widest"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              FORGE MY CHARACTER
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

/* ── forging ceremony ────────────────────────────────────────────────────── */

function ForgingCeremony({ characterName }: { characterName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
      role="status"
      aria-live="polite"
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="h-52 w-52"
      >
        <HeroStage form={2} level={1} state="levelup" />
      </motion.div>

      {/* orbiting interest symbols */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 size-2 rounded-full"
            style={{
              background: `var(--attr-${["strength", "intellect", "wisdom", "discipline", "vitality", "creativity"][i]})`,
              boxShadow: "0 0 10px currentColor",
            }}
            animate={{
              x: [Math.cos((i / 6) * Math.PI * 2) * 140, Math.cos((i / 6) * Math.PI * 2 + Math.PI * 2) * 140],
              y: [Math.sin((i / 6) * Math.PI * 2) * 140, Math.sin((i / 6) * Math.PI * 2 + Math.PI * 2) * 140],
              opacity: [0, 1, 1, 0],
            }}
            transition={{ duration: 2.2, delay: i * 0.12, repeat: 0 }}
          />
        ))}
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 18, letterSpacing: "0.5em" }}
        animate={{ opacity: 1, y: 0, letterSpacing: "0.18em" }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="font-display mt-6 text-2xl font-black text-gold sm:text-3xl"
      >
        YOUR CHARACTER IS FORGED
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="mt-2 text-sm text-muted-foreground"
      >
        Welcome, {characterName}. Your first quest is waiting.
      </motion.p>
    </motion.div>
  );
}
