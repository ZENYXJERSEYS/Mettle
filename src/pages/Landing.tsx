import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Coins,
  Dumbbell,
  EyeOff,
  Flame,
  ScrollText,
  ServerCog,
  Swords,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShowcaseSection } from "@/components/ShowcaseCarousel";
import HeroStage from "@/components/hero/HeroStage";
import MoltenXpBar from "@/components/game/MoltenXpBar";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.08 * i,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

function SectionHeading({ title }: { title: string }) {
  return (
    <motion.h2
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      className="font-display mb-2 text-center text-2xl font-bold sm:text-3xl"
    >
      {title}
    </motion.h2>
  );
}

/* ── Live visual proof: real components, real game math ─────────────────────── */

const MOCK_QUESTS = [
  {
    title: "5km run before work",
    diff: "Hard",
    xp: 100,
    gold: 45,
    attr: 3,
    attrName: "Strength",
    color: "var(--attr-strength)",
    icon: Dumbbell,
    mission: true,
  },
  {
    title: "Study calculus — 25 focused minutes",
    diff: "Medium",
    xp: 50,
    gold: 20,
    attr: 2,
    attrName: "Intellect",
    color: "var(--attr-intellect)",
    icon: BookOpen,
    mission: false,
  },
  {
    title: "Read 20 pages before bed",
    diff: "Easy",
    xp: 25,
    gold: 10,
    attr: 1,
    attrName: "Wisdom",
    color: "var(--attr-wisdom)",
    icon: ScrollText,
    mission: false,
  },
];

function DashboardMock() {
  return (
    <div className="surface-hero ring-edge grain relative overflow-hidden rounded-2xl">
      {/* app top bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-border/40 px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
            <Swords className="size-3 text-primary" />
          </div>
          <span className="font-display text-xs font-black tracking-[0.22em]">METTLE</span>
          <span className="ml-1 hidden rounded-full bg-secondary/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground sm:inline">
            Live preview
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs font-bold">
          <span className="flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-1 text-gold">
            <Coins className="size-3.5" />340
          </span>
          <span className="flex items-center gap-1 rounded-full bg-secondary/60 px-2.5 py-1">
            <Flame className="size-3.5 text-gold" />12
          </span>
        </div>
      </div>

      <div className="relative z-10 grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        {/* character panel */}
        <div className="flex flex-col items-center">
          <div className="flex w-full items-start justify-between">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/70">
                Character
              </div>
              <div className="font-display text-lg font-black leading-tight">Auren</div>
              <div className="text-gradient-violet font-display text-xs font-bold tracking-wide">
                Challenger
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-gradient-gold text-4xl font-black leading-none">7</div>
              <div className="text-[8px] font-bold uppercase tracking-[0.3em] text-muted-foreground/70">
                Level
              </div>
            </div>
          </div>
          <div className="h-44 w-full max-w-56 sm:h-52">
            <HeroStage form={2} level={7} state="idle" className="h-full w-full" />
          </div>
          <div className="w-full">
            <MoltenXpBar xpIntoLevel={1240} needed={1852} level={7} compact />
          </div>
        </div>

        {/* quest board */}
        <div className="flex flex-col gap-2">
          {MOCK_QUESTS.map((q) => (
            <div
              key={q.title}
              className={`surface-quest ring-edge rounded-xl p-3 ${
                q.mission ? "glow-violet" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[8px] font-bold uppercase tracking-[0.28em] text-muted-foreground/70">
                  {q.mission ? "Today's Mission" : "Quest"}
                </span>
                <span className="font-mono text-[10px]" style={{ color: q.color }}>
                  {q.diff}
                </span>
              </div>
              <div className="mt-1 truncate text-sm font-semibold">{q.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <span className="text-gold">+{q.xp} XP</span>
                <span className="text-gold/70">+{q.gold} Gold</span>
                <span style={{ color: q.color }}>
                  +{q.attr} {q.attrName}
                </span>
                <span className="ml-auto flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-primary">
                  <CheckCircle2 className="size-3" />
                  Complete honestly
                </span>
              </div>
            </div>
          ))}
          {/* adventure log line */}
          <div className="surface-panel ring-edge mt-1 rounded-xl px-3 py-2.5">
            <div className="text-[8px] font-bold uppercase tracking-[0.28em] text-muted-foreground/70">
              Adventure Log
            </div>
            <div className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">Completed honestly</span> · Quest:{" "}
                5km run before work · <span className="text-gold">+100 XP · +45 Gold</span>
              </p>
              <p className="italic">Reflection: negative splits on the last kilometre.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Crystal evolution — one live 3D preview + lightweight static thumbnails ── */

const FORMS = [
  { form: 1, lv: "LV 1+", name: "Spark", desc: "A faint light. You showed up.", tint: "#8b7fd4" },
  { form: 2, lv: "LV 5+", name: "Kindled", desc: "Orbiting shards. A habit is forming.", tint: "#a78bfa" },
  { form: 3, lv: "LV 10+", name: "Storm", desc: "Dense rings and satellites.", tint: "#7dd3fc" },
  { form: 4, lv: "LV 20+", name: "Ascendant", desc: "Cosmic material. Weeks of real effort.", tint: "#f0abfc" },
];

function CrystalThumb({ tint, active }: { tint: string; active: boolean }) {
  return (
    <div
      className="relative flex h-16 w-16 items-center justify-center"
      aria-hidden
    >
      <div
        className="h-9 w-9 rotate-45 rounded-[28%] transition-all duration-300"
        style={{
          background: `conic-gradient(from 140deg, ${tint}33, ${tint}88, ${tint}22, ${tint}66, ${tint}33)`,
          boxShadow: `0 0 ${active ? 22 : 10}px ${tint}66, inset 0 0 12px ${tint}44`,
        }}
      />
      <div
        className="absolute h-3.5 w-3.5 rounded-full"
        style={{
          background: `radial-gradient(circle, #fff8, ${tint})`,
          boxShadow: `0 0 10px ${tint}`,
        }}
      />
    </div>
  );
}

function EvolutionStrip() {
  const [selected, setSelected] = useState(3); // Ascendant by default
  const active = FORMS[selected];

  return (
    <div className="mx-auto max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="surface-hero ring-edge relative overflow-hidden rounded-2xl p-5"
      >
        <motion.div
          key={active.form}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="mx-auto h-64 w-full max-w-72 sm:h-80"
        >
          <HeroStage form={active.form} level={selected * 6 + 2} state="idle" className="h-full w-full" />
        </motion.div>
        <div className="relative z-10 mt-3 text-center">
          <div className="font-display text-xl font-black">
            {active.name} <span className="ml-1 font-mono text-xs font-bold text-gold">{active.lv}</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{active.desc}</p>
        </div>
      </motion.div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FORMS.map((f, i) => {
          const isActive = i === selected;
          return (
            <button
              key={f.form}
              onClick={() => setSelected(i)}
              aria-pressed={isActive}
              className={`surface-panel ring-edge flex items-center gap-3 rounded-xl p-3 text-left transition-all ${
                isActive ? "glow-violet ring-1 ring-primary/40" : "opacity-70 hover:opacity-100"
              }`}
            >
              <CrystalThumb tint={f.tint} active={isActive} />
              <div className="min-w-0">
                <div className="font-display truncate text-sm font-black">{f.name}</div>
                <div className="font-mono text-[10px] text-gold">{f.lv}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Gameplay loop preview (real copy from the app) ─────────────────────────── */

const LOOP_STEPS = [
  {
    n: "01",
    icon: Swords,
    title: "Accept a quest",
    body: "Name a real goal and its difficulty. The server prices it: Hard pays 100 XP, 45 Gold, +3 to its attribute.",
  },
  {
    n: "02",
    icon: Zap,
    title: "Do the real work",
    body: "The reps, the pages, the run — it happens in your life, not on a screen. Mettle just holds the receipt.",
  },
  {
    n: "03",
    icon: CheckCircle2,
    title: "Confirm honestly",
    body: "Before any reward, Mettle asks: “Did you genuinely complete this quest?” Saying “not yet” keeps the quest active — no punishment, no shame.",
  },
  {
    n: "04",
    icon: Trophy,
    title: "See the change",
    body: "+50 XP, +20 Gold, +2 Intellect float up. Your crystal pulses. The log records it — and an optional one-line reflection.",
  },
];

function LoopPreview() {
  return (
    <div className="mx-auto mt-10 max-w-3xl">
      <div className="relative space-y-3">
        <div
          aria-hidden
          className="absolute top-6 bottom-6 left-[27px] hidden w-px bg-gradient-to-b from-primary/50 via-primary/20 to-transparent sm:block"
        />
        {LOOP_STEPS.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.45 }}
            className="surface-quest ring-edge relative flex gap-4 rounded-xl p-4 sm:pl-6"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 ring-1 ring-primary/30">
              <s.icon className="size-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-sm font-bold">{s.title}</span>
                <span className="font-mono text-[10px] text-muted-foreground/60">{s.n}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* the completion moment, verbatim from the app */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="surface-hero ring-edge mt-6 rounded-2xl p-5 sm:p-7"
      >
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/70">
          The completion moment
        </div>
        <h3 className="font-display mt-3 text-center text-lg font-black tracking-[0.14em]">
          BE TRUTHFUL TO YOURSELF
        </h3>
        <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
          Did you genuinely complete this quest? XP is not knowledge. Gold is not growth.
          They are small tokens to make your progress visible and keep you moving.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 font-mono text-sm font-bold">
          <span className="glow-gold rounded-full bg-gold/15 px-4 py-1.5 text-gold ring-1 ring-gold/40">
            +100 XP
          </span>
          <span className="rounded-full bg-gold/10 px-4 py-1.5 text-gold ring-1 ring-gold/30">
            +45 Gold
          </span>
          <span
            className="rounded-full px-4 py-1.5 ring-1"
            style={{
              color: "var(--attr-strength)",
              background: "color-mix(in oklab, var(--attr-strength) 12%, transparent)",
              boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--attr-strength) 30%, transparent)",
            }}
          >
            +3 Strength
          </span>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          A small token for showing up. <span className="font-semibold text-foreground/80">The real progress is yours.</span>
        </p>
      </motion.div>
    </div>
  );
}

export default function Landing() {
  const stats = useQuery(api.leaderboard.getPublicStats) as
    | { heroes: number; honestCompletions: number; totalXp: number; longestStreak: number }
    | undefined;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen overflow-hidden"
    >
      {/* ── top atmosphere ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh]"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 0%, oklch(0.68 0.19 295 / 14%), transparent 65%)",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col px-5 sm:px-8">
        {/* ── nav ── */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <Swords className="size-4.5 text-primary" />
            </div>
            <span className="font-display text-lg font-black tracking-[0.24em]">
              METTLE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Sign in
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="glow-violet font-semibold">
                Start your first quest
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </header>

        {/* ── hero ── */}
        <section className="flex flex-col items-center pb-16 pt-14 text-center sm:pt-20">
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
            <Badge
              variant="outline"
              className="mb-7 gap-2 border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary/90"
            >
              <Sparkles className="size-3.5" />
              Your life is the progression system
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
            className="font-display max-w-3xl text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl"
          >
            When you improve your real life,
            <span className="text-gradient-violet block pt-1">
              your character improves too.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
            className="mt-4 font-display text-sm font-bold tracking-[0.3em] text-primary/90 uppercase"
          >
            The RPG for Real Life
          </motion.p>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={3}
            className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            Log real-world quests — studying, training, reading, building — and
            watch your character earn XP, Gold, and attributes. Every reward is
            calculated on the server. Your effort, your stats.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={4}
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
          >
            <Link to="/auth">
              <Button size="lg" className="glow-violet h-14 px-10 text-lg font-bold tracking-wide">
                Start your first quest
                <ArrowRight className="size-5" />
              </Button>
            </Link>
            <a href="#loop">
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-border/60 bg-secondary/40 px-8 text-base backdrop-blur"
              >
                <Zap className="size-4.5 text-primary" />
                See the gameplay loop
              </Button>
            </a>
          </motion.div>

          {/* core loop strip */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={5}
            className="mt-16 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {[
              { icon: Swords, label: "Accept a quest", sub: "a real goal" },
              { icon: Zap, label: "Do the work", sub: "in real life" },
              { icon: CheckCircle2, label: "Complete honestly", sub: "you confirm it happened" },
              { icon: Coins, label: "Level up", sub: "server-recorded" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.12, duration: 0.5 }}
                className="surface-panel ring-edge rounded-xl px-4 py-5 text-left"
              >
                <s.icon className="mb-3 size-5 text-primary" />
                <div className="text-sm font-semibold">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.sub}</div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── live visual proof ── */}
        <section id="proof" className="border-t border-border/50 py-16">
          <SectionHeading title="See it before you sign in" />
          <p className="mx-auto mb-10 max-w-xl text-center text-sm text-muted-foreground">
            This dashboard is rendered live with Mettle's real components — the 3D
            crystal, the molten XP bar, real quest rewards. Every number matches the
            actual game rules.
          </p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-4xl"
          >
            <DashboardMock />
          </motion.div>
        </section>

        {/* ── gameplay loop preview ── */}
        <section id="loop" className="border-t border-border/50 py-16">
          <SectionHeading title="The loop, up close" />
          <p className="mx-auto mb-2 max-w-xl text-center text-sm text-muted-foreground">
            What actually happens between “I should study” and a level-up.
          </p>
          <LoopPreview />
        </section>

        {/* ── crystal evolution ── */}
        <section id="evolution" className="border-t border-border/50 py-16">
          <SectionHeading title="One crystal. Your entire history." />
          <p className="mx-auto mb-10 max-w-xl text-center text-sm text-muted-foreground">
            Your character is a living record of effort. It cannot be bought, faked,
            or reset — it only changes when you complete real quests.
          </p>
          <EvolutionStrip />
        </section>

        {/* ── how it works ── */}
        <section className="border-t border-border/50 py-16">
          <SectionHeading title="How it works" />
          <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-4">
            {[
              { n: "01", icon: Swords, t: "Choose a quest", d: "Pick a real-world goal — study, train, read, build." },
              { n: "02", icon: Zap, t: "Do the real activity", d: "The work happens in your life, not on a screen." },
              { n: "03", icon: CheckCircle2, t: "Complete honestly", d: "You confirm the work happened. The server records and calculates the reward." },
              { n: "04", icon: Flame, t: "Improve your character", d: "Level up, gain attributes, evolve your crystal." },
            ].map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.09, duration: 0.45 }}
                className="surface-quest ring-edge relative rounded-xl p-5"
              >
                <span className="font-display absolute top-3 right-4 text-2xl font-black text-foreground/10">
                  {s.n}
                </span>
                <s.icon className="mb-3 size-5 text-primary" />
                <div className="text-sm font-bold">{s.t}</div>
                <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.d}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── verification, explained honestly ── */}
        <section id="verify" className="border-t border-border/50 py-16">
          <SectionHeading title="How completions are verified" />
          <p className="mx-auto mb-10 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
            Honest answer: your completion is <span className="font-semibold text-foreground">self-reported by you</span> and{" "}
            <span className="font-semibold text-foreground">server-recorded by Mettle</span>. No app can watch
            you do 20 push-ups — pretending otherwise would be the real fake. Here is
            what actually happens instead:
          </p>
          <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-3">
            {[
              {
                icon: CheckCircle2,
                t: "You confirm it — deliberately",
                d: "A pause screen asks if you genuinely completed the quest before any reward appears. “Not yet” keeps the quest active with zero penalty.",
              },
              {
                icon: ServerCog,
                t: "The server records it",
                d: "Your confirmation triggers a server-side transaction: XP, Gold and attributes are computed in Convex and stored with an immutable completion record. The browser never calculates rewards — there is nothing to tamper with.",
              },
              {
                icon: EyeOff,
                t: "Nothing is surveilled",
                d: "No camera, GPS, or screen tracking. Mettle trusts you to report honestly and treats XP as a token of commitment — never as proof of worth.",
              },
            ].map((s, i) => (
              <motion.div
                key={s.t}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.09, duration: 0.45 }}
                className="surface-panel ring-edge rounded-xl p-5"
              >
                <s.icon className="mb-3 size-5 text-primary" />
                <div className="text-sm font-bold">{s.t}</div>
                <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.d}</div>
              </motion.div>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-xl text-center text-[11px] leading-relaxed text-muted-foreground/70">
            Every completion is written as a permanent event in your Adventure Log —
            quest, reward, and your optional one-line reflection. Your history is the audit.
          </p>
        </section>

        {/* ── material showcase ── */}
        <ShowcaseSection />

        {/* ── streak / persistence strip ── */}
        <section className="border-t border-border/50 py-16">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="surface-hero ring-edge grain relative w-full rounded-2xl px-6 py-10 sm:px-12"
            >
              <Flame className="mx-auto mb-4 size-8 text-gold" />
              <h3 className="font-display text-xl font-bold sm:text-2xl">
                Miss a day? The story continues.
              </h3>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Streaks reward consistency, not perfection. Complete one quest
                today to keep the flame alive — multiple completions in a single
                day count once, and a missed day resets gently.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-3 text-left">
                {[
                  { k: "Server-calculated", v: "XP, Gold & attributes are computed in a Convex transaction" },
                  { k: "Idempotent", v: "Retried completions never double-reward" },
                  { k: "Yours alone", v: "Ownership checks on every quest and stat" },
                ].map((f) => (
                  <div key={f.k} className="rounded-lg border border-border/40 bg-secondary/25 p-3">
                    <div className="text-xs font-semibold text-foreground">{f.k}</div>
                    <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{f.v}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── outcomes / early heroes — real database numbers ── */}
        <section className="border-t border-border/50 py-16">
          <SectionHeading title="What showing up adds up to" />
          <p className="mx-auto mb-6 max-w-xl text-center text-sm text-muted-foreground">
            These numbers are queried live from Mettle's database — nothing here is
            a mockup. The first heroes are creating their characters right now, and
            the leaderboard is wide open.
          </p>
          <div className="mx-auto mb-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: "Heroes created", v: stats ? stats.heroes.toLocaleString() : "—" },
              { k: "Honest completions", v: stats ? stats.honestCompletions.toLocaleString() : "—" },
              { k: "XP recorded", v: stats ? stats.totalXp.toLocaleString() : "—" },
              { k: "Longest streak", v: stats ? `${stats.longestStreak}d` : "—" },
            ].map((s) => (
              <motion.div
                key={s.k}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="surface-panel ring-edge rounded-xl px-4 py-5 text-center"
              >
                <div className="font-display text-gradient-gold text-2xl font-black sm:text-3xl">{s.v}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {s.k}
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-3">
            {[
              {
                icon: Flame,
                t: "Consistency you can see",
                d: "Streaks turn intention into a visible flame. Show up today, keep it burning tomorrow.",
              },
              {
                icon: ScrollText,
                t: "A log you can reread",
                d: "Every honest completion and reflection accumulates into a timeline of what you actually did — not what you planned to do.",
              },
              {
                icon: Trophy,
                t: "Progress without pretense",
                d: "Your crystal, level and attributes grow only from confirmed work. That is why the progress feels earned.",
              },
            ].map((s, i) => (
              <motion.div
                key={s.t}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.09, duration: 0.45 }}
                className="surface-quest ring-edge rounded-xl p-5"
              >
                <s.icon className="mb-3 size-5 text-gold" />
                <div className="text-sm font-bold">{s.t}</div>
                <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.d}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── product principle ── */}
        <section className="border-t border-border/50 py-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            className="surface-panel ring-edge mx-auto max-w-3xl rounded-2xl p-6 sm:p-8"
          >
            <h2 className="font-display text-center text-lg font-black tracking-[0.14em] text-primary/90">
              BE TRUTHFUL TO YOURSELF
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-relaxed text-muted-foreground">
              Mettle does not pretend XP equals knowledge. XP and Gold are small
              tokens that make effort visible, create positive feedback, and
              encourage users to keep going. The real reward is the skill,
              discipline, health, understanding, or confidence gained in real life.
            </p>
          </motion.div>
        </section>

        {/* ── final CTA ── */}
        <section className="border-t border-border/50 py-20 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display mx-auto max-w-xl text-2xl font-bold sm:text-3xl"
          >
            Your first quest takes 25 minutes. The crystal remembers it forever.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-4 max-w-lg text-sm italic text-muted-foreground"
          >
            Be truthful to yourself. Mettle can reward your commitment, but only
            you know what you truly gained.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="mt-8"
          >
            <Link to="/auth">
              <Button size="lg" className="glow-violet h-12 px-10 text-base font-semibold">
                Start your first quest
                <ArrowRight className="size-4.5" />
              </Button>
            </Link>
          </motion.div>
        </section>

        <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
          METTLE — The RPG for Real Life. Real backend, real persistence, honest rewards.
        </footer>
      </div>
    </motion.div>
  );
}
