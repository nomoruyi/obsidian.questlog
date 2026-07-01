import { describe, it, expect } from "vitest";
import { buildRecap, RecapArgs } from "../src/engine/recap";
import { SettlementResult } from "../src/engine/settlement";
import { parseNote } from "../src/parser/parser";
import { DEFAULT_CONFIG } from "../src/config";

function mkResult(over: Partial<SettlementResult> = {}): SettlementResult {
  return {
    daysSettled: 1,
    missedDays: 0,
    hpStart: 100,
    hpEnd: 100,
    tokensUsed: 0,
    setbackFired: false,
    streakBefore: 0,
    streakAfter: 0,
    newLastSettledDate: "2026-06-28",
    ...over,
  };
}

function mkArgs(over: Partial<RecapArgs> = {}): RecapArgs {
  return {
    fromISO: "2026-06-27",
    toISO: "2026-06-28",
    settledNotes: [],
    config: DEFAULT_CONFIG,
    overallXpAtStart: 0,
    skillsXp: {},
    dailyRegen: 10,
    result: mkResult(),
    ...over,
  };
}

// must/hard => xp 100, coins 3, category body
const NOTE_BODY = parseNote(`- [x] A #prio/must #diff/hard #body`);
// should/medium => xp 30, coins 4, category mind
const NOTE_MIND = parseNote(`- [x] B #prio/should #diff/medium #mind`);

describe("buildRecap", () => {
  it("sums the haul (xp + coins) over settled present notes", () => {
    const recap = buildRecap(mkArgs({
      settledNotes: [NOTE_BODY, NOTE_MIND],
      overallXpAtStart: 130, // before = 0, after = level 1 → no level-up noise
      result: mkResult({ daysSettled: 2 }),
    }));
    expect(recap.xpGained).toBe(130);     // 100 + 30
    expect(recap.coinsGained).toBe(7);    // 3 + 4
  });

  it("derives an overall level-up by subtracting the haul from the start XP", () => {
    const recap = buildRecap(mkArgs({
      settledNotes: [NOTE_BODY, NOTE_MIND], // haul 130
      overallXpAtStart: 1050,               // after = level 2 (>=1000)
    }));
    expect(recap.overallBefore).toBe(1);    // 1050 - 130 = 920 → level 1
    expect(recap.overallAfter).toBe(2);
  });

  it("reports per-skill level-ups only for skills that crossed a boundary", () => {
    const recap = buildRecap(mkArgs({
      settledNotes: [NOTE_BODY, NOTE_MIND], // body +100, mind +30
      skillsXp: { body: 1050, mind: 500 },
    }));
    expect(recap.skillLevelUps).toEqual([{ skill: "body", before: 1, after: 2 }]);
  });

  it("flags a rank change when the overall level straddles a rank boundary", () => {
    const recap = buildRecap(mkArgs({
      settledNotes: [NOTE_BODY, NOTE_MIND], // haul 130
      overallXpAtStart: 31623,              // level 11 (Ashigaru)
    }));
    expect(recap.overallBefore).toBe(10);   // 31493 → level 10 (Heimin)
    expect(recap.overallAfter).toBe(11);
    expect(recap.rankBefore).toBe("Heimin");
    expect(recap.rankAfter).toBe("Ashigaru");
  });

  it("reports no level-ups for a small haul with no crossings", () => {
    const recap = buildRecap(mkArgs({
      settledNotes: [NOTE_BODY, NOTE_MIND], // haul 130
      overallXpAtStart: 130,
      skillsXp: { body: 130, mind: 130 },
    }));
    expect(recap.skillLevelUps).toEqual([]);
    expect(recap.overallBefore).toBe(recap.overallAfter);
    expect(recap.rankBefore).toBe(recap.rankAfter);
  });

  it("reflects a setback flag while keeping level-up math derived from the start XP", () => {
    const recap = buildRecap(mkArgs({
      settledNotes: [NOTE_BODY, NOTE_MIND], // haul 130
      overallXpAtStart: 1050,
      result: mkResult({ setbackFired: true }),
    }));
    expect(recap.setbackFired).toBe(true);
    expect(recap.overallBefore).toBe(1);
    expect(recap.overallAfter).toBe(2);
  });

  it("passes HP/streak fields through and computes gross regen + damage", () => {
    // two notes with undone tasks: must => 10 dmg, should => 5 dmg
    const dmg1 = parseNote(`- [ ] X #prio/must #diff/hard`);
    const dmg2 = parseNote(`- [ ] Y #prio/should #diff/easy`);
    const recap = buildRecap(mkArgs({
      settledNotes: [dmg1, dmg2],
      dailyRegen: 10,
      result: mkResult({
        daysSettled: 2,
        missedDays: 1,
        hpStart: 80,
        hpEnd: 72,
        tokensUsed: 1,
        streakBefore: 5,
        streakAfter: 6,
      }),
    }));
    expect(recap.hpStart).toBe(80);
    expect(recap.hpEnd).toBe(72);
    expect(recap.tokensUsed).toBe(1);
    expect(recap.streakBefore).toBe(5);
    expect(recap.streakAfter).toBe(6);
    expect(recap.daysSettled).toBe(2);
    expect(recap.missedDays).toBe(1);
    expect(recap.hpRegen).toBe(20);   // daysSettled(2) * dailyRegen(10)
    expect(recap.hpDamage).toBe(15);  // 10 + 5
  });
});
