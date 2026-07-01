import { describe, it, expect } from "vitest";
import { defaultState, balance } from "../src/state/state";

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
