// ── GAME RULES — single tuning surface ────────────────────────────────────────
// Every number here drives BOTH the server reward math and the client UI.

export const ATTRS = [
  "strength",
  "intellect",
  "wisdom",
  "discipline",
  "vitality",
  "creativity",
] as const;
export type Attr = (typeof ATTRS)[number];

export const DIFFICULTIES = ["easy", "medium", "hard", "epic"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

// Category → attribute mapping (the game loop's connective tissue)
export const CATEGORY_TO_ATTR: Record<string, Attr> = {
  intellect: "intellect",
  coding: "intellect",
  studying: "intellect",
  strength: "strength",
  fitness: "strength",
  vitality: "vitality",
  sport: "vitality",
  wisdom: "wisdom",
  reading: "wisdom",
  discipline: "discipline",
  habits: "discipline",
  creativity: "creativity",
  writing: "creativity",
  art: "creativity",
  building: "creativity",
};

export const CATEGORY_META: Record<
  string,
  { label: string; attr: Attr; icon: string; hue: string }
> = {
  intellect: { label: "Intellect", attr: "intellect", icon: "Brain", hue: "142 70% 55%" },
  strength: { label: "Strength", attr: "strength", icon: "Dumbbell", hue: "18 80% 58%" },
  vitality: { label: "Vitality", attr: "vitality", icon: "HeartPulse", hue: "350 75% 58%" },
  wisdom: { label: "Wisdom", attr: "wisdom", icon: "BookOpen", hue: "48 85% 58%" },
  discipline: { label: "Discipline", attr: "discipline", icon: "Shield", hue: "210 75% 58%" },
  creativity: { label: "Creativity", attr: "creativity", icon: "Sparkles", hue: "280 75% 62%" },
};

export const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; xp: number; gold: number; attrGain: number; color: string }
> = {
  easy:   { label: "Easy",   xp: 25,  gold: 10,  attrGain: 1, color: "var(--color-vitality)" },
  medium: { label: "Medium", xp: 50,  gold: 20,  attrGain: 2, color: "var(--color-intellect)" },
  hard:   { label: "Hard",   xp: 100, gold: 45,  attrGain: 3, color: "var(--color-strength)" },
  epic:   { label: "Epic",   xp: 200, gold: 100, attrGain: 5, color: "var(--color-wisdom)" },
};

// ── LEVELING ──────────────────────────────────────────────────────────────────
// xpRequiredForLevel(level) — non-linear curve: floor(100 * level^1.5)
export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(Math.max(1, level), 1.5));
}

// Cumulative XP needed to REACH a given level (levels are 1-indexed).
// Level 1 starts at 0 total XP. To reach level 2 you need 100,
// to reach 3 you need 100+282, etc.
export function cumulativeXpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpForLevel(l);
  return total;
}

// Given total XP, compute level + progress toward the next level.
export function levelFromXp(totalXp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  progress: number; // 0..1
} {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  while (xpForLevel(level) <= remaining) {
    remaining -= xpForLevel(level);
    level++;
  }
  const need = xpForLevel(level);
  return {
    level,
    currentLevelXp: need,
    nextLevelXp: need,
    xpIntoLevel: remaining,
    progress: need === 0 ? 0 : remaining / need,
  };
}

// Character titles per level band
export function titleForLevel(level: number): string {
  if (level >= 25) return "Ascended";
  if (level >= 18) return "Paragon";
  if (level >= 12) return "Veteran";
  if (level >= 8) return "Adept";
  if (level >= 4) return "Challenger";
  return "Wanderer";
}

// Crystal form tier — drives the 3D hero's visual identity
export function formForLevel(level: number): number {
  if (level >= 20) return 4;
  if (level >= 10) return 3;
  if (level >= 5) return 2;
  return 1;
}

// ── STREAKS ───────────────────────────────────────────────────────────────────
// UTC day-key "YYYY-MM-DD". A streak increments when today != last day,
// stays when today == last day (multiple completions in one day),
// resets to 1 when a full day was missed.
export function streakForCompletion(
  lastCompletionDay: string | undefined,
  todayKey: string,
): number {
  if (!lastCompletionDay) return 1;
  if (lastCompletionDay === todayKey) return -1; // sentinel: handled by caller
  const last = new Date(lastCompletionDay + "T00:00:00Z").getTime();
  const today = new Date(todayKey + "T00:00:00Z").getTime();
  const dayDiff = Math.round((today - last) / 86400000);
  if (dayDiff === 1) return -2; // sentinel: handled by caller (increment)
  return 1; // missed ≥1 day → reset to 1
}

// Actual streak mutation, given current streak and last day
export function nextStreak(
  currentStreak: number,
  lastCompletionDay: string | undefined,
  todayKey: string,
): number {
  if (!lastCompletionDay) return 1;
  if (lastCompletionDay === todayKey) return Math.max(1, currentStreak);
  const last = new Date(lastCompletionDay + "T00:00:00Z").getTime();
  const today = new Date(todayKey + "T00:00:00Z").getTime();
  const dayDiff = Math.round((today - last) / 86400000);
  return dayDiff === 1 ? currentStreak + 1 : 1;
}

// ── LEVEL-UP REWARDS (server-calculated, deterministic) ──────────────────────
export function levelUpReward(level: number): {
  gold: number;
  attrPoints: number;
  title?: string;
} {
  return {
    gold: 50 + level * 10,
    attrPoints: 1,
    title: level % 5 === 0 ? titleForLevel(level) : undefined,
  };
}

// ── QUEST VALIDATION ─────────────────────────────────────────────────────────
export const MAX_TITLE_LEN = 80;
export const MIN_TITLE_LEN = 3;

export function validateQuestInput(input: {
  title: string;
  category: string;
  difficulty: string;
}): { ok: true; title: string } | { ok: false; error: string } {
  const title = (input.title ?? "").trim();
  if (title.length < MIN_TITLE_LEN)
    return { ok: false, error: `Quest title must be at least ${MIN_TITLE_LEN} characters.` };
  if (title.length > MAX_TITLE_LEN)
    return { ok: false, error: `Quest title must be at most ${MAX_TITLE_LEN} characters.` };
  if (!CATEGORY_META[input.category])
    return { ok: false, error: "Unknown quest category." };
  if (!(DIFFICULTIES as readonly string[]).includes(input.difficulty))
    return { ok: false, error: "Unknown quest difficulty." };
  return { ok: true, title };
}

// UTC day key helper
export function dayKeyFromTimestamp(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}