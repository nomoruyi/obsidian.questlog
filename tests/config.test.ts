import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG } from "../src/config";

describe("config economy defaults", () => {
  it("ships an inverted coin grid (must<should<could per difficulty)", () => {
    const g = DEFAULT_CONFIG.coinGrid;
    expect(g.must).toEqual({ easy: 1, medium: 2, hard: 3 });
    expect(g.should).toEqual({ easy: 2, medium: 4, hard: 6 });
    expect(g.could).toEqual({ easy: 3, medium: 6, hard: 9 });
  });

  it("ships rewards path and built-in prices", () => {
    expect(DEFAULT_CONFIG.rewardsNotePath).toBe("_questlog/ql_Rewards.md");
    expect(DEFAULT_CONFIG.potionPrices).toEqual({ minor: 50, normal: 100, major: 150 });
    expect(DEFAULT_CONFIG.freezePrice).toBe(50);
  });

  it("ships consistency defaults (hp, regen, penalties, vice grid, setback)", () => {
    expect(DEFAULT_CONFIG.hpEnabled).toBe(true);
    expect(DEFAULT_CONFIG.streakEnabled).toBe(true);
    expect(DEFAULT_CONFIG.startingMaxHP).toBe(100);
    expect(DEFAULT_CONFIG.defaultRegen).toBe(10);
    expect(DEFAULT_CONFIG.undonePenalty).toEqual({ must: 10, should: 5, could: 0 });
    expect(DEFAULT_CONFIG.viceLoss).toEqual({ hard: 5, medium: 10, easy: 20 });
    expect(DEFAULT_CONFIG.setbackMode).toBe("level-floor");
    expect(DEFAULT_CONFIG.setbackPercent).toBe(50);
    expect(DEFAULT_CONFIG.maxHpUpgradeAmount).toBe(10);
    expect(DEFAULT_CONFIG.regenUpgradeAmount).toBe(2);
  });

  it("enables mission rollover by default", () => {
    expect(DEFAULT_CONFIG.missionRolloverEnabled).toBe(true);
  });

  it("ships a default flat finalize-day reward of 20", () => {
    expect(DEFAULT_CONFIG.finalizeDayReward).toBe(20);
  });
});
