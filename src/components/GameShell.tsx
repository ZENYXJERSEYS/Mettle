import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { Coins, Flame, Swords, Trophy, Backpack, LayoutDashboard, LogOut, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/shop", label: "Shop", icon: Store },
  { to: "/inventory", label: "Inventory", icon: Backpack },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
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
    <div className="min-h-screen pb-20 sm:pb-8">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/75 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-8 sm:py-3">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
                <Swords className="size-4 text-primary" />
              </div>
              <span className="font-display hidden text-base font-bold tracking-wide sm:block">
                LIFE<span className="text-primary">RPG</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
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
        {/* mobile nav */}
        <nav className="flex items-center justify-around border-t border-border/30 md:hidden" aria-label="Primary mobile">
          {NAV.map((n) => {
            const active = location.pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <n.icon className="size-4.5" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      {children}
    </div>
  );
}
