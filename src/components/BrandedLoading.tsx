export default function BrandedLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="relative flex items-center justify-center">
        <span className="absolute size-16 rounded-full border border-primary/30 animate-[spin_3s_linear_infinite]" />
        <span className="absolute size-24 rounded-full border border-primary/15 animate-[spin_5s_linear_infinite_reverse]" />
        <span className="size-6 rounded-full bg-primary shadow-[0_0_24px_6px_oklch(0.68_0.19_295/45%)] animate-pulse" />
      </div>
      <div className="font-display text-lg font-bold tracking-[0.3em] text-foreground/90">
        LIFE<span className="text-primary">RPG</span>
      </div>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-1/3 animate-[loading-slide_1.2s_ease-in-out_infinite] rounded-full bg-primary/70" />
      </div>
      <style>{`
        @keyframes loading-slide {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(360%); }
        }
      `}</style>
    </div>
  );
}
