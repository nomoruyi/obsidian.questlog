import { describe, it, expect } from "vitest";
import { cumulativeXpForLevel, levelForXp, levelProgress, rankForLevel } from "../src/engine/levels";

const base = 50, exp = 1.5;

describe("levels", () => {
  it("level 1 starts at 0 XP; thresholds rise on the curve", () => {
    expect(cumulativeXpForLevel(1, base, exp)).toBe(0);
    expect(cumulativeXpForLevel(2, base, exp)).toBe(50);    // round(50 * 1^1.5)
    expect(cumulativeXpForLevel(3, base, exp)).toBe(141);   // round(50 * 2^1.5)
  });

  it("levelForXp returns the highest reached level", () => {
    expect(levelForXp(0, base, exp)).toBe(1);
    expect(levelForXp(49, base, exp)).toBe(1);
    expect(levelForXp(50, base, exp)).toBe(2);
    expect(levelForXp(141, base, exp)).toBe(3);
  });

  it("levelProgress reports XP into the level and XP needed for the next", () => {
    expect(levelProgress(60, base, exp)).toEqual({ level: 2, into: 10, needed: 91 });
  });

  it("rankForLevel gives one title per 10 levels, last repeats", () => {
    const titles = ["Novice", "Apprentice", "Adept"];
    expect(rankForLevel(1, titles)).toBe("Novice");
    expect(rankForLevel(10, titles)).toBe("Novice");
    expect(rankForLevel(11, titles)).toBe("Apprentice");
    expect(rankForLevel(999, titles)).toBe("Adept");
  });
});
