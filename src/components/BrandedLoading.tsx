import { useEffect, useState } from "react";

const MESSAGES = [
  "Awakening your character...",
  "Loading the quest board...",
  "Reforging your progression...",
];

export default function BrandedLoading({ hint }: { hint?: string }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (hint) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % MESSAGES.length), 1800);
    return () => clearInterval(t);
  }, [hint]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="relative flex items-center justify-center">
        <span className="absolute size-16 rounded-full border border-primary/30 animate-[spin_3s_linear_infinite]" />
        <span className="absolute size-24 rounded-full border border-primary/15 animate-[spin_5s_linear_infinite_reverse]" />
        <span className="size-6 rounded-full bg-primary shadow-[0_0_24px_6px_oklch(0.68_0.19_295/45%)] animate-pulse" />
      </div>
      <div className="font-display text-2xl font-black tracking-[0.35em] text-foreground">
        METTLE
      </div>
      <div className="h-1 w-44 overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-1/3 animate-[loading-slide_1.2s_ease-in-out_infinite] rounded-full bg-primary/70" />
      </div>
      <p className="min-h-5 text-xs text-muted-foreground" aria-live="polite">
        {hint ?? MESSAGES[idx]}
      </p>
      <style>{`
        @keyframes loading-slide {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(360%); }
        }
      `}</style>
    </div>
  );
}
