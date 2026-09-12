import { motion } from "framer-motion";
import {
  ArrowRight,
  Coins,
  Flame,
  Swords,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShowcaseSection } from "@/components/ShowcaseCarousel";

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

export default function Landing() {
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
                Enter the world
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
            watch your character earn XP, Gold, and attributes. Persistence is
            server-calculated. No fake progress. Your effort, your stats.
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
                Enter the World
                <ArrowRight className="size-5" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-border/60 bg-secondary/40 px-8 text-base backdrop-blur"
              >
                <Zap className="size-4.5 text-primary" />
                Continue as guest
              </Button>
            </Link>
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
              { icon: Trophy, label: "Complete it", sub: "server-verified" },
              { icon: Coins, label: "Level up", sub: "for real" },
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

        {/* ── how it works ── */}
        <section className="border-t border-border/50 py-16">
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            className="font-display mb-3 text-center text-2xl font-bold sm:text-3xl"
          >
            How it works
          </motion.h2>
          <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-4">
            {[
              { n: "01", icon: Swords, t: "Choose a quest", d: "Pick a real-world goal — study, train, read, build." },
              { n: "02", icon: Zap, t: "Do the real activity", d: "The work happens in your life, not on a screen." },
              { n: "03", icon: Trophy, t: "Earn XP and Gold", d: "The server verifies and calculates every reward." },
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

        {/* ── final CTA ── */}
        <section className="border-t border-border/50 py-20 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display mx-auto max-w-xl text-2xl font-bold sm:text-3xl"
          >
            The work you do in real life is the progression system.
          </motion.h2>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="mt-8"
          >
            <Link to="/auth">
              <Button size="lg" className="glow-violet h-12 px-10 text-base font-semibold">
                Begin your ascent
                <ArrowRight className="size-4.5" />
              </Button>
            </Link>
          </motion.div>
        </section>

        <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
          METTLE — The RPG for Real Life. Real backend, real persistence, real rewards.
        </footer>
      </div>
    </motion.div>
  );
}
