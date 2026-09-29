import { describe, it, expect } from "vitest";
import { cumulativeXpForLevel, levelForXp, levelProgress, rankForLevel, levelEta, MIN_LEVEL_EXPONENT, MAX_LEVEL_EXPONENT } from "../src/engine/levels";

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

describe("levelEta", () => {
  it("reports the cumulative XP for the target level and the days at the given pace", () => {
    expect(levelEta(100, 1000, 1.5, 800)).toEqual({ totalXp: 985038, days: 1232 });
  });

  it("reports no day estimate when there is no pace yet", () => {
    expect(levelEta(100, 1000, 1.5, 0)).toEqual({ totalXp: 985038, days: null });
  });
});

describe("levelForXp cost and bounds", () => {
  const scan = (xp: number, base: number, exp: number) => {
    let level = 1;
    while (cumulativeXpForLevel(level + 1, base, exp) <= xp) level++;
    return level;
  };

  it("agrees with a brute-force scan across the whole allowed exponent band", () => {
    for (const base of [500, 1000, 1337]) {
      for (const exp of [MIN_LEVEL_EXPONENT, 1.35, 1.5, 2, 3, MAX_LEVEL_EXPONENT]) {
        const xps = [0, 1, 44518, 985038];
        // Straddle every boundary: the rounding corrections only fire there.
        for (let level = 2; level <= 60; level++) {
          const at = cumulativeXpForLevel(level, base, exp);
          xps.push(at - 1, at, at + 1);
        }
        for (const xp of xps) expect(levelForXp(xp, base, exp)).toBe(scan(xp, base, exp));
      }
    }
  });

  // A curve where the closed-form estimate overshoots by one. Left uncorrected,
  // floorXpForLevel would hand a level-floor setback MORE XP than the player had.
  it("corrects an estimate that overshoots the true level", () => {
    expect(levelForXp(1522350729812963, 13150, 3.558679223060608)).toBe(scan(1522350729812963, 13150, 3.558679223060608));
  });

  // A scan needs ~1e10 iterations on this curve (measured: ~116s). The plugin
  // calls levelForXp on every status-bar update and every note render, so it
  // has to stay cheap even for a curve hand-edited into data.json.
  it("stays fast on a degenerate sub-1 exponent instead of scanning", () => {
    const started = Date.now();
    const level = levelForXp(100000, 1000, 0.2);
    expect(Date.now() - started).toBeLessThan(1000);
    expect(cumulativeXpForLevel(level, 1000, 0.2)).toBeLessThanOrEqual(100000);
  });
});
