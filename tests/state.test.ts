import { describe, it, expect } from "vitest";
import { defaultState, balance, avgXpPerNote } from "../src/state/state";

describe("state economy", () => {
  it("defaultState zeroes coins and starts with empty inventory", () => {
    const s = defaultState();
    expect(s.coinsEarned).toBe(0);
    expect(s.coinsSpent).toBe(0);
    expect(s.inventory).toEqual({});
  });

  it("balance = earned - spent, clamped at 0", () => {
    expect(balance({ ...defaultState(), coinsEarned: 100, coinsSpent: 30 })).toBe(70);
    expect(balance({ ...defaultState(), coinsEarned: 10, coinsSpent: 40 })).toBe(0);
  });
});

describe("consistency state defaults", () => {
  it("seeds hp/maxHP/regen/streak and a null settlement date", () => {
    const s = defaultState();
    expect(s.hp).toBe(100);
    expect(s.maxHP).toBe(100);
    expect(s.dailyRegen).toBe(10);
    expect(s.streak).toBe(0);
    expect(s.lastSettledDate).toBeNull();
  });
});

describe("longest streak and purchase counters", () => {
  it("defaultState seeds longestStreak at 0 and an empty purchases map", () => {
    const s = defaultState();
    expect(s.longestStreak).toBe(0);
    expect(s.purchases).toEqual({});
  });
});

describe("avgXpPerNote", () => {
  const entry = (overallXp: number) => ({ overallXp, perSkill: {}, score: { done: 0, total: 0 } });

  it("is 0 with nothing logged", () => {
    expect(avgXpPerNote([])).toBe(0);
  });

  it("averages the entries it is given, rounded", () => {
    expect(avgXpPerNote([entry(900), entry(800), entry(0)])).toBe(567);   // 1700 / 3
  });
});
