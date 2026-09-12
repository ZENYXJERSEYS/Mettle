# ⚔️ Life RPG

**Your life is the progression system.**

Log real-world activities — studying, training, reading, building — as quests. Complete them in real life, mark them complete in the app, and watch your character earn server-verified XP, Gold, attributes, and levels. When you improve your real life, your character visibly improves too.

---

## The Core Loop

```
Accept a real quest → do the work in real life → complete it
→ earn XP + Gold + attribute gain → level up → return tomorrow
```

## Architecture

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite + Tailwind 4 + shadcn/ui + Framer Motion |
| 3D hero | React Three Fiber + drei (lazy-loaded, capped DPR) |
| Backend | Convex queries / mutations (reactive subscriptions) |
| Auth | Convex Auth (email OTP + anonymous guest) |
| Database | Convex storage (document tables with indexes) |

**Data flow:** Client dispatches intents only (e.g. `completeQuest(questId)`). The server authenticates, verifies ownership, checks eligibility, computes all rewards from `src/convex/gameRules.ts`, updates character/quest/completion/log tables in a single serialized transaction, and returns the authoritative diff. The client never submits XP, Gold, level, attribute, or streak values.

```
UI (Dashboard)                     Convex (server-authoritative)
──────────────                     ────────────────────────────
click "Complete"  ──mutation──▶  completeQuest()
                                   1. getAuthUserId
                                   2. quest lookup + ownership check
                                   3. idempotency check (status === completed)
                                   4. mark quest completed
                                   5. insert questCompletion record
                                   6. creditRewards(): xp/gold/attr/streak/
                                      level-ups (multi-level safe)
                                   7. activity log entries
reactive subscription  ◀──patch──  characters / quests / activityLog
XP bar + hero pulse + floats ◀──   returns reward diff (+ levelUp?)
```

## Game Rules (single tuning surface: `src/convex/gameRules.ts`)

- **XP curve:** `xpForLevel(level) = floor(100 * level^1.5)` — non-linear
- **Attributes (6):** Strength, Intellect, Wisdom, Discipline, Vitality, Creativity
- **Category → attribute mapping:** studying/coding → Intellect, fitness → Strength, running → Vitality, reading → Wisdom, habits/meditation → Discipline, writing/art/building → Creativity
- **Difficulties:** Easy (+25 XP / +10 G), Medium (+50 / +20), Hard (+100 / +45), Epic (+200 / +100)
- **Level-up rewards:** `50 + level*10` Gold + 1 attribute point; new title every 5 levels
- **Streaks:** UTC day keys — multiple completions on one day count once, consecutive days increment, missed days reset gently
- **Crystal forms (3D hero):** 4 tiers, unlocked at levels 1 / 5 / 10 / 20

## Getting Started

```bash
bun install
bun convex dev --once   # push Convex functions + regenerate types
bun run dev             # start Vite dev server
bun test                # run progression tests
bun tsc -b --noEmit     # typecheck
```

### Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_CONVEX_URL` | Convex deployment URL (auto-configured by the platform here) |
| `VLY_INTEGRATION_KEY` | Platform integration key (auto-injected; only needed self-hosted) |

No secrets are committed. In this managed environment both values are injected automatically — configure them via the project's Keys/API keys tab, not by editing env files.

## Demo Script (90–150 seconds)

1. Open the landing page — the thesis: *"When you improve your real life, your character improves too."*
2. Sign in with email OTP, or "Continue as guest."
3. Point out the character: name, title, level, Gold, streak, molten XP bar, six attribute gauges, and the 3D crystal hero.
4. Accept the quest **"Study calculus for 25 minutes"** (Intellect · Medium).
5. Complete it — watch the staged sequence: card resolves → hero pulses → **+50 XP / +20 Gold / +2 Intellect** float up in layers → XP bar sweeps → streak/log update.
6. Click **"+120 XP (demo)"** on the hero panel to cross the next level threshold — the full 3-second level-up transformation plays: rings gather, the crystal cracks open, the new level lands with a spring, and the Gold/attribute/title rewards reveal.
7. Refresh the page — everything persists (server state, not localStorage).
8. Close with: *"The work you do in real life is the progression system."*

## Security Model

- Every query and mutation is scoped to `getAuthUserId(ctx)` — no cross-user reads or writes possible
- All reward math happens server-side; the client is never authoritative
- `completeQuest` is idempotent: retrying a completed quest returns `alreadyCompleted` and never double-rewards
- Input validation on the server (title length, category, difficulty) with clear error messages
- Convex transactions are serialized — no lost updates under concurrent completions

## Tests

`bun test` runs `tests/gameRules.test.ts` (14 cases) covering:

- XP curve values and multi-level crossing
- Streak edge cases (first completion, same-day, consecutive, missed day)
- Quest validation (short titles, bad category/difficulty, trimming)
- Form tiers, title bands, level-up rewards, UTC day keys

## Completed Features

- ✅ Public landing page with product thesis and core-loop explainer
- ✅ Email OTP + anonymous guest auth with protected routes
- ✅ Persistent character: level, XP, Gold, streak, 6 attributes, titles, crystal form
- ✅ Quest create/complete/delete with server-calculated rewards
- ✅ Atomic, idempotent completion transaction with ownership checks
- ✅ Adventure Log with real event history
- ✅ Molten-metal XP bar, attribute instrument panels, reward float choreography
- ✅ 3D crystal hero (R3F): idle breathing, pointer parallax, completion pulse, level-up transformation
- ✅ Staged, skippable, replay-safe level-up modal driven by the actual server response
- ✅ WebGL-unavailable and prefers-reduced-motion fallbacks
- ✅ Responsive desktop + mobile layouts with bottom navigation
- ✅ Loading skeletons, empty states, error toasts, disabled states
- ✅ Progression test suite

## Deferred (v2 candidates)

- Shop with purchasable cosmetics and inventory/equip system
- Quest editing and recurring-quest scheduling
- Achievements/milestones beyond level titles
- Additional crystal forms and equipped-item visuals on the 3D hero
- Social features and deep analytics

## Known Limitations

- Streak day keys use UTC (a run at 11 PM local may count for the next day in UTC+ zones)
- Level-up rewards grant attribute points as a flat +1 rather than spendable pools
- The "+120 XP (demo)" button is a dev fixture for demos, capped server-side at 2000 XP per grant
