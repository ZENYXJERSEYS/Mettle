import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import {
  Coins,
  Compass,
  Flame,
  Swords,
  Trophy,
  Backpack,
  LayoutDashboard,
  LogOut,
  Store,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Quests", icon: LayoutDashboard },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/profile", label: "Hero", icon: UserRound },
  { to: "/shop", label: "Shop", icon: Store },
  { to: "/inventory", label: "Gear", icon: Backpack },
  { to: "/leaderboard", label: "Ranks", icon: Trophy },
];

export default function GameShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const character = useQuery(api.characters.getMyCharacter);
  const { signOut } = useAuthActions();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/75 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-8 sm:py-3">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
                <Swords className="size-4 text-primary" />
              </div>
              <span className="font-display text-base font-black tracking-[0.22em]">
                METTLE
              </span>
            </Link>
            <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
              {NAV.map((n) => {
                const active = location.pathname === n.to;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary/12 text-primary ring-1 ring-primary/25"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    <n.icon className="size-4" />
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {character ? (
              <>
                <span
                  className="flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1.5 font-mono text-sm font-bold text-gold"
                  aria-label="Gold"
                >
                  <Coins className="size-4" />
                  {character.gold.toLocaleString()}
                </span>
                <span
                  className="flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1.5 font-mono text-sm font-bold"
                  aria-label="Streak"
                  title="Complete a quest today to keep your streak"
                >
                  <Flame className="size-4 text-gold" />
                  {character.streak}
                </span>
              </>
            ) : null}
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out" className="text-muted-foreground">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>
      {children}
      {/* fixed mobile bottom nav — large touch targets */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-background/90 backdrop-blur-md md:hidden"
        aria-label="Primary mobile"
      >
        <div className="mx-auto grid w-full max-w-md grid-cols-6">
          {NAV.map((n) => {
            const active = location.pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <n.icon className="size-5" />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
