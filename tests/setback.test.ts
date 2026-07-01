import { describe, it, expect } from "vitest";
import { floorXpForLevel, applySetback } from "../src/engine/setback";
import { DEFAULT_CONFIG } from "../src/config";
import { defaultState } from "../src/state/state";
import { cumulativeXpForLevel, levelForXp } from "../src/engine/levels";

const base = DEFAULT_CONFIG.levelBase, exp = DEFAULT_CONFIG.levelExponent;

describe("floorXpForLevel", () => {
  it("returns the cumulative floor of the current level and never de-levels", () => {
    const xp = cumulativeXpForLevel(3, base, exp) + 250; // mid level 3
    const floor = floorXpForLevel(xp, base, exp);
    expect(floor).toBe(cumulativeXpForLevel(3, base, exp));
    expect(levelForXp(floor, base, exp)).toBe(3);
  });

  it("leaves an exactly-at-floor xp unchanged and never goes negative", () => {
    expect(floorXpForLevel(0, base, exp)).toBe(0);
    const floor2 = cumulativeXpForLevel(2, base, exp);
    expect(floorXpForLevel(floor2, base, exp)).toBe(floor2);
  });
});

describe("applySetback", () => {
  it("level-floor mode resets xp to the level floor and refills HP", () => {
    const s = { ...defaultState(), overallXp: cumulativeXpForLevel(3, base, exp) + 250, hp: 0, maxHP: 100 };
    const fired = applySetback(s, { ...DEFAULT_CONFIG, setbackMode: "level-floor" });
    expect(fired).toBe(true);
    expect(s.overallXp).toBe(cumulativeXpForLevel(3, base, exp));
    expect(s.hp).toBe(100);
  });

  it("lose-percent mode drops the configured fraction of into-level progress and refills HP", () => {
    const into = 400;
    const s = { ...defaultState(), overallXp: cumulativeXpForLevel(3, base, exp) + into, hp: 0, maxHP: 100 };
    const fired = applySetback(s, { ...DEFAULT_CONFIG, setbackMode: "lose-percent", setbackPercent: 50 });
    expect(fired).toBe(true);
    expect(s.overallXp).toBe(cumulativeXpForLevel(3, base, exp) + 200);
    expect(s.hp).toBe(100);
  });

  it("off mode leaves xp and HP untouched (soft wall) and reports not fired", () => {
    const s = { ...defaultState(), overallXp: 5000, hp: 0, maxHP: 100 };
    const fired = applySetback(s, { ...DEFAULT_CONFIG, setbackMode: "off" });
    expect(fired).toBe(false);
    expect(s.overallXp).toBe(5000);
    expect(s.hp).toBe(0);
  });
});
