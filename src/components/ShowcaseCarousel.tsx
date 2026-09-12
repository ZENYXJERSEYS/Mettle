import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Coins, Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATEGORY_META,
  DIFFICULTIES,
  DIFFICULTY_META,
  type Difficulty,
} from "@/convex/gameRules";

/* ── context ─────────────────────────────────────────────────────────────── */

const CarouselContext = createContext<{
  onCardClose: (index: number) => void;
  currentIndex: number;
}>({ onCardClose: () => {}, currentIndex: 0 });

/* ── content: real categories, real example quests, real reward math ────── */

const EXAMPLE_QUESTS: Record<string, { title: string; blurb: string }> = {
  intellect: {
    title: "Study calculus for 25 minutes",
    blurb: "Deep work on the hardest subject you are avoiding.",
  },
  strength: {
    title: "Gym session — push day",
    blurb: "Lift. The barbell does not negotiate.",
  },
  vitality: {
    title: "10k training run",
    blurb: "Cardio that compounds, mile after mile.",
  },
  wisdom: {
    title: "Read 30 pages of a hard book",
    blurb: "Not the easy one. The one that makes you think.",
  },
  discipline: {
    title: "Meditate 10 minutes before bed",
    blurb: "The quiet daily rep nobody sees.",
  },
  creativity: {
    title: "Ship one feature of your side project",
    blurb: "Make something exist that did not this morning.",
  },
};

const CARD_KEYS = Object.keys(CATEGORY_META) as (keyof typeof CATEGORY_META)[];

function RewardTable({ category }: { category: string }) {
  const attr = CATEGORY_META[category].attr;
  return (
    <div className="grid grid-cols-2 gap-2">
      {DIFFICULTIES.map((d: Difficulty) => {
        const meta = DIFFICULTY_META[d];
        return (
          <div
            key={d}
            className="rounded-lg border border-border/50 bg-secondary/30 px-3 py-2.5"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {meta.label}
            </div>
            <div className="mt-1 flex items-baseline gap-2 font-mono text-sm">
              <span className="font-bold text-energy">+{meta.xp} XP</span>
              <span className="text-gold/90">+{meta.gold} G</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              +{meta.attrGain} {attr}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── carousel ────────────────────────────────────────────────────────────── */

export function ShowcaseCarousel({ className }: { className?: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const checkScrollability = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    checkScrollability();
    window.addEventListener("resize", checkScrollability);
    return () => window.removeEventListener("resize", checkScrollability);
  }, [checkScrollability]);

  const scrollBy = (dir: -1 | 1) => {
    trackRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  const handleCardClose = useCallback((index: number) => {
    const el = trackRef.current;
    if (!el) return;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const cardWidth = isMobile ? 232 : 336;
    const gap = isMobile ? 16 : 20;
    el.scrollTo({ left: (cardWidth + gap) * (index + 1), behavior: "smooth" });
    setCurrentIndex(index);
  }, []);

  return (
    <CarouselContext.Provider value={{ onCardClose: handleCardClose, currentIndex }}>
      <div className={cn("relative w-full", className)}>
        <div
          ref={trackRef}
          onScroll={checkScrollability}
          className="flex w-full snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-auto scroll-smooth pb-2 [scrollbar-width:none] md:gap-5 [&::-webkit-scrollbar]:hidden"
        >
          {CARD_KEYS.map((key, index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.5,
                delay: Math.min(0.12 * index, 0.5),
                ease: [0.22, 1, 0.36, 1],
              }}
              className="snap-start last:pr-[8%] md:last:pr-[20%]"
            >
              <CategoryCard category={key} index={index} />
            </motion.div>
          ))}
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            disabled={!canScrollLeft}
            aria-label="Scroll showcase left"
            className="flex size-10 items-center justify-center rounded-full border border-border/60 bg-secondary/50 text-foreground transition hover:bg-secondary disabled:opacity-40"
          >
            <ArrowLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            disabled={!canScrollRight}
            aria-label="Scroll showcase right"
            className="flex size-10 items-center justify-center rounded-full border border-border/60 bg-secondary/50 text-foreground transition hover:bg-secondary disabled:opacity-40"
          >
            <ArrowRight className="size-5" />
          </button>
        </div>
      </div>
    </CarouselContext.Provider>
  );
}

/* ── card ────────────────────────────────────────────────────────────────── */

function CategoryCard({ category, index }: { category: string; index: number }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { onCardClose } = useContext(CarouselContext);
  const meta = CATEGORY_META[category];
  const example = EXAMPLE_QUESTS[category];

  const close = useCallback(() => {
    setOpen(false);
    onCardClose(index);
  }, [index, onCardClose]);

  // return focus to the opener when the modal closes
  const openerRef = useRef<HTMLButtonElement>(null);
  const prevOpen = useRef(false);
  useEffect(() => {
    if (prevOpen.current && !open) openerRef.current?.focus();
    prevOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  useOutsideClick(containerRef, close);

  const hue = `var(--attr-${category})`;

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 h-screen overflow-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 h-full w-full bg-black/80 backdrop-blur-lg"
            />
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              ref={containerRef}
              role="dialog"
              aria-modal="true"
              aria-label={`${meta.label} quest details`}
              className="relative z-[60] mx-auto my-10 h-fit max-w-2xl rounded-2xl border border-border/60 bg-card p-5 shadow-2xl md:p-8"
            >
              <button
                type="button"
                onClick={close}
                aria-label="Close details"
                className="sticky top-0 right-0 float-right -mr-1 -mt-1 flex size-9 items-center justify-center rounded-full bg-secondary text-foreground transition hover:bg-accent"
              >
                <X className="size-5" />
              </button>

              <div className="flex items-center gap-3">
                <div
                  className="flex size-11 items-center justify-center rounded-xl"
                  style={{
                    background: `oklch(from ${hue} 65% c h / 15%)`,
                    boxShadow: `0 0 18px oklch(from ${hue} 65% c h / 30%)`,
                  }}
                >
                  <Trophy className="size-5" style={{ color: hue }} />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {meta.label}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Trains <span style={{ color: hue }}>{meta.attr}</span>
                  </div>
                </div>
              </div>

              <h3 className="font-display mt-5 text-2xl font-bold">
                {example?.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {example?.blurb}
              </p>

              <div className="mt-6">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Coins className="size-3.5 text-gold" />
                  Server-calculated rewards
                </div>
                <RewardTable category={category} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        ref={openerRef}
        onClick={() => setOpen(true)}
        aria-label={`${meta.label} quest example — open details`}
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 flex h-72 w-56 flex-col justify-between overflow-hidden rounded-2xl border border-border/50 text-left md:h-[24rem] md:w-80"
        style={{
          background: `linear-gradient(160deg, oklch(from ${hue} 45% c h / 28%) 0%, var(--card) 55%, var(--background) 100%)`,
        }}
      >
        {/* engraved icon watermark */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 opacity-[0.07]"
        >
          <Trophy className="size-40" style={{ color: hue }} strokeWidth={1} />
        </div>
        {/* top scrim for text legibility */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent"
        />

        <div className="relative p-5 md:p-6">
          <div
            className="mb-3 flex size-9 items-center justify-center rounded-lg"
            style={{
              background: `oklch(from ${hue} 65% c h / 18%)`,
              boxShadow: `0 0 14px oklch(from ${hue} 65% c h / 25%)`,
            }}
          >
            <Trophy className="size-4" style={{ color: hue }} />
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {meta.label}
          </div>
          <h3 className="font-display mt-2 max-w-[16rem] text-lg font-bold leading-snug [text-wrap:balance] md:text-2xl">
            {example?.title}
          </h3>
        </div>

        <div className="relative flex items-center justify-between p-5 pt-0 md:p-6 md:pt-0">
          <span className="font-mono text-xs text-muted-foreground">
            → {meta.attr}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary/80">
            View rewards
          </span>
        </div>
      </motion.button>
    </>
  );
}

/* ── outside-click hook (typed) ──────────────────────────────────────────── */

function useOutsideClick(
  ref: RefObject<HTMLDivElement | null>,
  callback: () => void,
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      callback();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, callback]);
}

/* ── section wrapper for the landing page ────────────────────────────────── */

export function ShowcaseSection() {
  return (
    <section className="border-t border-border/50 py-16">
      <motion.h2
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        className="font-display mb-3 text-center text-2xl font-bold sm:text-3xl"
      >
        Every quest trains who you become
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mb-10 text-center text-sm text-muted-foreground"
      >
        Six paths. Real rewards, calculated on the server. Tap a card for the numbers.
      </motion.p>

      <div className="mx-auto max-w-6xl px-1 sm:px-0">
        <ShowcaseCarousel />
      </div>
    </section>
  );
}

export default ShowcaseCarousel;
