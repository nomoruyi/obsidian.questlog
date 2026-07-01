import { describe, it, expect } from "vitest";
import { Recap } from "../src/engine/recap";
import { planCelebration, confettiPlan, sfxSequence } from "../src/engine/celebration";

function mkRecap(over: Partial<Recap> = {}): Recap {
  return {
    fromISO: "2026-06-01", toISO: "2026-06-01",
    daysSettled: 1, missedDays: 0,
    xpGained: 0, coinsGained: 0,
    hpStart: 100, hpEnd: 100, hpRegen: 10, hpDamage: 0, setbackFired: false,
    tokensUsed: 0, streakBefore: 0, streakAfter: 1,
    overallBefore: 5, overallAfter: 5,
    rankBefore: "Heimin", rankAfter: "Heimin",
    skillLevelUps: [],
    ...over,
  };
}

describe("planCelebration", () => {
  it("returns 'rank' when the rank title changed", () => {
    expect(planCelebration(mkRecap({ rankBefore: "Heimin", rankAfter: "Ashigaru", overallBefore: 10, overallAfter: 11 })))
      .toBe("rank");
  });
  it("returns 'level' when overall level rose without a rank change", () => {
    expect(planCelebration(mkRecap({ overallBefore: 5, overallAfter: 6 }))).toBe("level");
  });
  it("returns 'level' when only a skill leveled up", () => {
    expect(planCelebration(mkRecap({ skillLevelUps: [{ skill: "body", before: 1, after: 2 }] }))).toBe("level");
  });
  it("returns 'none' when nothing changed", () => {
    expect(planCelebration(mkRecap())).toBe("none");
  });
  it("prefers 'rank' when a rank change and level-ups coincide", () => {
    expect(planCelebration(mkRecap({
      rankBefore: "Heimin", rankAfter: "Ashigaru", overallBefore: 10, overallAfter: 11,
      skillLevelUps: [{ skill: "body", before: 1, after: 2 }],
    }))).toBe("rank");
  });
  it("returns 'none' on a setback (overall dropped, no skill level-up)", () => {
    expect(planCelebration(mkRecap({ overallBefore: 8, overallAfter: 4 }))).toBe("none");
  });
});

describe("confettiPlan", () => {
  it("is empty for 'none'", () => {
    expect(confettiPlan("none")).toEqual([]);
  });
  it("is a single burst for 'level'", () => {
    expect(confettiPlan("level")).toHaveLength(1);
  });
  it("is bigger and gold for 'rank'", () => {
    const level = confettiPlan("level");
    const rank = confettiPlan("rank");
    const total = (bursts: { particleCount: number }[]) => bursts.reduce((s, b) => s + b.particleCount, 0);
    expect(rank.length).toBeGreaterThanOrEqual(2);
    expect(total(rank)).toBeGreaterThan(total(level));
    expect(rank.some((b) => b.colors?.includes("#FFD700"))).toBe(true);
  });
});

describe("sfxSequence", () => {
  it("is empty for 'none'", () => {
    expect(sfxSequence("none")).toEqual([]);
  });
  it("ascends in pitch for 'level'", () => {
    const seq = sfxSequence("level");
    for (let i = 1; i < seq.length; i++) expect(seq[i].freq).toBeGreaterThan(seq[i - 1].freq);
  });
  it("has more notes for 'rank' than 'level'", () => {
    expect(sfxSequence("rank").length).toBeGreaterThan(sfxSequence("level").length);
  });
});
