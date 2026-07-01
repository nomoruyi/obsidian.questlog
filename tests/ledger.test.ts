import { describe, it, expect } from "vitest";
import { defaultState } from "../src/state/state";
import { applyContribution, removeContribution } from "../src/state/ledger";

describe("ledger", () => {
  it("adds a contribution to overall and per-skill XP", () => {
    const s = defaultState();
    applyContribution(s, "daily/A.md", { overallXp: 90, perSkill: { body: 70, mind: 20 }, score: { done: 2, total: 3 } });
    expect(s.overallXp).toBe(90);
    expect(s.skills).toEqual({ body: 70, mind: 20 });
  });

  it("is idempotent: re-applying the same note's contribution does not double-count", () => {
    const s = defaultState();
    const contrib = { overallXp: 90, perSkill: { body: 70, mind: 20 }, score: { done: 2, total: 3 } };
    applyContribution(s, "daily/A.md", contrib);
    applyContribution(s, "daily/A.md", contrib);
    expect(s.overallXp).toBe(90);
    expect(s.skills).toEqual({ body: 70, mind: 20 });
  });

  it("applies the delta when a note's contribution changes (box unchecked)", () => {
    const s = defaultState();
    applyContribution(s, "daily/A.md", { overallXp: 90, perSkill: { body: 70, mind: 20 }, score: { done: 2, total: 3 } });
    applyContribution(s, "daily/A.md", { overallXp: 20, perSkill: { mind: 20 }, score: { done: 1, total: 3 } });
    expect(s.overallXp).toBe(20);
    expect(s.skills).toEqual({ body: 0, mind: 20 });
  });

  it("keeps contributions from different notes separate and additive", () => {
    const s = defaultState();
    applyContribution(s, "daily/A.md", { overallXp: 50, perSkill: { body: 50 }, score: { done: 1, total: 1 } });
    applyContribution(s, "daily/B.md", { overallXp: 20, perSkill: { body: 20 }, score: { done: 1, total: 1 } });
    expect(s.overallXp).toBe(70);
    expect(s.skills).toEqual({ body: 70 });
  });

  it("removeContribution subtracts a note's XP and drops its ledger entry", () => {
    const s = defaultState();
    applyContribution(s, "daily/A.md", { overallXp: 50, perSkill: { body: 50 }, score: { done: 1, total: 1 } });
    applyContribution(s, "daily/B.md", { overallXp: 20, perSkill: { body: 20 }, score: { done: 1, total: 1 } });
    removeContribution(s, "daily/A.md");
    expect(s.overallXp).toBe(20);
    expect(s.skills).toEqual({ body: 20 });
    expect(s.ledger["daily/A.md"]).toBeUndefined();
  });

  it("removeContribution is a no-op for an unknown note", () => {
    const s = defaultState();
    applyContribution(s, "daily/A.md", { overallXp: 50, perSkill: { body: 50 }, score: { done: 1, total: 1 } });
    removeContribution(s, "daily/missing.md");
    expect(s.overallXp).toBe(50);
    expect(s.skills).toEqual({ body: 50 });
  });

  it("delta-applies coinsEarned when a note's coins change", () => {
    const s = defaultState();
    applyContribution(s, "daily/A.md", { overallXp: 90, perSkill: { body: 90 }, score: { done: 2, total: 3 }, coins: 10 });
    expect(s.coinsEarned).toBe(10);
    applyContribution(s, "daily/A.md", { overallXp: 20, perSkill: { body: 20 }, score: { done: 1, total: 3 }, coins: 4 });
    expect(s.coinsEarned).toBe(4);
  });

  it("treats a contribution with no coins field as 0", () => {
    const s = defaultState();
    applyContribution(s, "daily/A.md", { overallXp: 50, perSkill: {}, score: { done: 1, total: 1 } });
    expect(s.coinsEarned).toBe(0);
  });

  it("removeContribution subtracts coinsEarned and clamps at 0", () => {
    const s = defaultState();
    applyContribution(s, "daily/A.md", { overallXp: 50, perSkill: {}, score: { done: 1, total: 1 }, coins: 12 });
    removeContribution(s, "daily/A.md");
    expect(s.coinsEarned).toBe(0);
  });
});
