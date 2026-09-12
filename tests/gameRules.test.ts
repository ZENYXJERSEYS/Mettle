import { describe, expect, it } from "vitest";
import {
  dayKeyFromTimestamp,
  formForLevel,
  levelFromXp,
  levelUpReward,
  nextStreak,
  titleForLevel,
  validateQuestInput,
  xpForLevel,
} from "../src/convex/gameRules";

describe("XP curve", () => {
  it("matches floor(100 * level^1.5)", () => {
    expect(xpForLevel(1)).toBe(100);
    expect(xpForLevel(2)).toBe(282);
    expect(xpForLevel(3)).toBe(519);
    expect(xpForLevel(10)).toBe(3162);
  });

  it("levels from total XP and exposes progress toward next level", () => {
    const lvl1 = levelFromXp(0);
    expect(lvl1.level).toBe(1);
    expect(lvl1.xpIntoLevel).toBe(0);
    expect(lvl1.progress).toBe(0);

    const lvl2 = levelFromXp(150);
    expect(lvl2.level).toBe(2);
    expect(lvl2.xpIntoLevel).toBe(50);
    expect(lvl2.currentLevelXp).toBe(282);
  });

  it("handles rewards crossing multiple levels", () => {
    // 0 XP -> +500 => level 2 (needs 100), level 3 (needs 282 more => 382 total), 118 left in level 3
    const r = levelFromXp(500);
    expect(r.level).toBe(3);
    expect(r.xpIntoLevel).toBe(118);
  });
});

describe("streak logic", () => {
  it("starts at 1 on first completion", () => {
    expect(nextStreak(0, undefined, "2026-09-12")).toBe(1);
  });

  it("stays flat for multiple completions on the same day", () => {
    expect(nextStreak(3, "2026-09-12", "2026-09-12")).toBe(3);
  });

  it("increments on consecutive days", () => {
    expect(nextStreak(3, "2026-09-11", "2026-09-12")).toBe(4);
  });

  it("resets to 1 after a missed day", () => {
    expect(nextStreak(7, "2026-09-09", "2026-09-12")).toBe(1);
  });
});

describe("quest validation", () => {
  it("rejects titles shorter than 3 chars", () => {
    expect(validateQuestInput({ title: "ab", category: "intellect", difficulty: "easy" })).toEqual({
      ok: false,
      error: "Quest title must be at least 3 characters.",
    });
  });

  it("rejects unknown category and difficulty", () => {
    expect(
      validateQuestInput({ title: "Valid quest", category: "gossip", difficulty: "easy" }).ok,
    ).toBe(false);
    expect(
      validateQuestInput({ title: "Valid quest", category: "intellect", difficulty: "legendary" }).ok,
    ).toBe(false);
  });

  it("trims valid input", () => {
    const r = validateQuestInput({ title: "  Study calculus 25 min  ", category: "intellect", difficulty: "medium" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.title).toBe("Study calculus 25 min");
  });
});

describe("presentation rules", () => {
  it("assigns form tiers by level", () => {
    expect(formForLevel(1)).toBe(1);
    expect(formForLevel(4)).toBe(1);
    expect(formForLevel(5)).toBe(2);
    expect(formForLevel(9)).toBe(2);
    expect(formForLevel(10)).toBe(3);
    expect(formForLevel(20)).toBe(4);
  });

  it("assigns titles by level band", () => {
    expect(titleForLevel(1)).toBe("Wanderer");
    expect(titleForLevel(4)).toBe("Challenger");
    expect(titleForLevel(8)).toBe("Adept");
    expect(titleForLevel(12)).toBe("Veteran");
  });

  it("scales level-up gold rewards", () => {
    expect(levelUpReward(2).gold).toBe(70);
    expect(levelUpReward(10).gold).toBe(150);
  });

  it("formats UTC day keys", () => {
    expect(dayKeyFromTimestamp(Date.UTC(2026, 8, 12, 23, 30))).toBe("2026-09-12");
  });
});