import { describe, it, expect } from "vitest";
import { enumerateDates, addDays, isExcludedWeekday, settleDays, formatSettlement, NoteResolver } from "../src/engine/settlement";
import { DEFAULT_CONFIG } from "../src/config";
import { defaultState } from "../src/state/state";
import { ParsedNote, ParsedTask } from "../src/types";
import { cumulativeXpForLevel } from "../src/engine/levels";

function emptyNote(): ParsedNote { return { tasks: [], vices: [] }; }
function undoneMust(): ParsedTask {
  return { text: "", done: false, priority: "must", difficulty: "medium", category: "general", optional: false, section: "", children: [] };
}
function resolverOf(map: Record<string, ParsedNote>): NoteResolver {
  return (d) => map[d] ?? null;
}

describe("enumerateDates / addDays", () => {
  it("addDays crosses month boundaries in UTC", () => {
    expect(addDays("2026-06-30", 1)).toBe("2026-07-01");
    expect(addDays("2026-07-01", -1)).toBe("2026-06-30");
  });
  it("enumerateDates is inclusive and empty when from > to", () => {
    expect(enumerateDates("2026-06-01", "2026-06-03")).toEqual(["2026-06-01", "2026-06-02", "2026-06-03"]);
    expect(enumerateDates("2026-06-03", "2026-06-03")).toEqual(["2026-06-03"]);
    expect(enumerateDates("2026-06-04", "2026-06-03")).toEqual([]);
  });
  it("isExcludedWeekday matches the ISO date's UTC day-of-week", () => {
    // 2026-06-07 is a Sunday, 2026-06-08 is a Monday
    expect(isExcludedWeekday("2026-06-07", [0])).toBe(true);
    expect(isExcludedWeekday("2026-06-08", [0])).toBe(false);
    expect(isExcludedWeekday("2026-06-07", [])).toBe(false);
  });
});

describe("settleDays", () => {
  const today = "2026-06-10";

  it("regens each present day, builds streak, uses no tokens when nothing missed", () => {
    const s = { ...defaultState(), hp: 50, lastSettledDate: "2026-06-06" };
    const map = { "2026-06-07": emptyNote(), "2026-06-08": emptyNote(), "2026-06-09": emptyNote() };
    const r = settleDays({ fromISO: "2026-06-07", todayISO: today, noteResolver: resolverOf(map), state: s, config: DEFAULT_CONFIG });
    expect(r.daysSettled).toBe(3);
    expect(r.missedDays).toBe(0);
    expect(s.hp).toBe(80);           // 50 + 3*10 regen, no damage
    expect(s.streak).toBe(3);
    expect(r.tokensUsed).toBe(0);
    expect(s.lastSettledDate).toBe("2026-06-09");
  });

  it("covers missed days with freeze tokens (streak survives)", () => {
    const s = { ...defaultState(), inventory: { freeze: 2 }, lastSettledDate: "2026-06-06" };
    const map = { "2026-06-07": emptyNote() }; // 08 and 09 missing
    const r = settleDays({ fromISO: "2026-06-07", todayISO: today, noteResolver: resolverOf(map), state: s, config: DEFAULT_CONFIG });
    expect(r.missedDays).toBe(2);
    expect(r.tokensUsed).toBe(2);
    expect(s.inventory.freeze).toBeUndefined();
    expect(s.streak).toBe(1);        // survives, +1 for the single present day
  });

  it("breaks the streak when missed days exceed tokens", () => {
    const s = { ...defaultState(), streak: 9, inventory: { freeze: 1 }, lastSettledDate: "2026-06-06" };
    const map = {}; // all 3 days missing
    const r = settleDays({ fromISO: "2026-06-07", todayISO: today, noteResolver: resolverOf(map), state: s, config: DEFAULT_CONFIG });
    expect(r.missedDays).toBe(3);
    expect(r.tokensUsed).toBe(1);
    expect(s.streak).toBe(0);
  });

  it("fires a setback when HP hits zero and refills", () => {
    const s = { ...defaultState(), hp: 5, overallXp: cumulativeXpForLevel(3, DEFAULT_CONFIG.levelBase, DEFAULT_CONFIG.levelExponent) + 300, lastSettledDate: "2026-06-08" };
    const big: ParsedNote = { tasks: [undoneMust(), undoneMust(), undoneMust()], vices: [] }; // 30 dmg
    const r = settleDays({ fromISO: "2026-06-09", todayISO: today, noteResolver: resolverOf({ "2026-06-09": big }), state: s, config: DEFAULT_CONFIG });
    expect(r.setbackFired).toBe(true);
    expect(s.hp).toBe(100);
    expect(s.overallXp).toBe(cumulativeXpForLevel(3, DEFAULT_CONFIG.levelBase, DEFAULT_CONFIG.levelExponent));
  });

  it("with hpEnabled=false leaves HP/setback untouched but still resolves streak", () => {
    const s = { ...defaultState(), hp: 30, inventory: { freeze: 0 }, lastSettledDate: "2026-06-08" };
    const cfg = { ...DEFAULT_CONFIG, hpEnabled: false };
    const r = settleDays({ fromISO: "2026-06-09", todayISO: today, noteResolver: resolverOf({ "2026-06-09": { tasks: [undoneMust()], vices: [] } }), state: s, config: cfg });
    expect(s.hp).toBe(30);           // unchanged
    expect(r.setbackFired).toBe(false);
    expect(s.streak).toBe(1);        // streak still advances
  });

  it("with streakEnabled=false drains HP but never touches streak/tokens", () => {
    const s = { ...defaultState(), hp: 50, streak: 4, inventory: { freeze: 1 }, lastSettledDate: "2026-06-08" };
    const cfg = { ...DEFAULT_CONFIG, streakEnabled: false };
    settleDays({ fromISO: "2026-06-09", todayISO: today, noteResolver: resolverOf({}), state: s, config: cfg });
    expect(s.streak).toBe(4);
    expect(s.inventory.freeze).toBe(1);
  });

  it("credits the flat day reward for each present day, missed days excluded", () => {
    const s = { ...defaultState(), inventory: { freeze: 2 }, lastSettledDate: "2026-06-06" };
    const map = { "2026-06-07": emptyNote() }; // 08 and 09 missed
    const r = settleDays({ fromISO: "2026-06-07", todayISO: today, noteResolver: resolverOf(map), state: s, config: DEFAULT_CONFIG });
    expect(r.daysSettled).toBe(1);
    expect(r.missedDays).toBe(2);
    expect(r.dayRewardCoins).toBe(20);   // 1 present day * 20; 2 missed days earn nothing
    expect(s.coinsEarned).toBe(20);
  });

  it("credits nothing when finalizeDayReward is 0", () => {
    const s = { ...defaultState(), lastSettledDate: "2026-06-06" };
    const map = { "2026-06-07": emptyNote(), "2026-06-08": emptyNote(), "2026-06-09": emptyNote() };
    const cfg = { ...DEFAULT_CONFIG, finalizeDayReward: 0 };
    const r = settleDays({ fromISO: "2026-06-07", todayISO: today, noteResolver: resolverOf(map), state: s, config: cfg });
    expect(r.daysSettled).toBe(3);
    expect(r.dayRewardCoins).toBe(0);
    expect(s.coinsEarned).toBe(0);
  });

  it("credits nothing on an empty range", () => {
    const s = { ...defaultState(), lastSettledDate: "2026-06-09" };
    const r = settleDays({ fromISO: "2026-06-10", todayISO: today, noteResolver: resolverOf({}), state: s, config: DEFAULT_CONFIG });
    expect(r.dayRewardCoins).toBe(0);
    expect(s.coinsEarned).toBe(0);
  });

  it("excluded weekday needs no note, still settles, regens HP, and stays streak-neutral", () => {
    // 2026-06-07 is a Sunday; exclude it. 08 and 09 are normal days with notes.
    const s = { ...defaultState(), hp: 50, lastSettledDate: "2026-06-06" };
    const cfg = { ...DEFAULT_CONFIG, excludedWeekdays: [0] };
    const map = { "2026-06-08": emptyNote(), "2026-06-09": emptyNote() }; // 07 has no note at all
    const r = settleDays({ fromISO: "2026-06-07", todayISO: today, noteResolver: resolverOf(map), state: s, config: cfg });
    expect(r.missedDays).toBe(0);        // Sunday is exempt, not missed
    expect(r.daysSettled).toBe(3);        // all 3 days count as settled
    expect(s.hp).toBe(80);                // 50 + 3*10 regen, no damage anywhere
    expect(s.streak).toBe(2);             // only the 2 non-excluded days grow the streak
  });

  it("excluded weekday cannot take damage even if a note with undone tasks exists", () => {
    const s = { ...defaultState(), hp: 50, lastSettledDate: "2026-06-06" };
    const cfg = { ...DEFAULT_CONFIG, excludedWeekdays: [0] };
    const map = { "2026-06-07": { tasks: [undoneMust(), undoneMust(), undoneMust()], vices: [] } }; // 30 dmg, but 07 is Sunday/excluded
    const r = settleDays({ fromISO: "2026-06-07", todayISO: "2026-06-08", noteResolver: resolverOf(map), state: s, config: cfg });
    expect(r.daysSettled).toBe(1);
    expect(s.hp).toBe(60);                // regen only, damage ignored on excluded day
  });

  it("excluded weekday with no note does not consume freeze tokens or break the streak", () => {
    const s = { ...defaultState(), streak: 5, inventory: { freeze: 0 }, lastSettledDate: "2026-06-06" };
    const cfg = { ...DEFAULT_CONFIG, excludedWeekdays: [0] };
    const r = settleDays({ fromISO: "2026-06-07", todayISO: "2026-06-08", noteResolver: resolverOf({}), state: s, config: cfg });
    expect(r.missedDays).toBe(0);
    expect(r.tokensUsed).toBe(0);
    expect(s.streak).toBe(5);             // neutral: neither grows nor breaks
  });

  it("excluded weekday still earns the flat day-reward coins", () => {
    const s = { ...defaultState(), lastSettledDate: "2026-06-06" };
    const cfg = { ...DEFAULT_CONFIG, excludedWeekdays: [0] };
    const r = settleDays({ fromISO: "2026-06-07", todayISO: "2026-06-08", noteResolver: resolverOf({}), state: s, config: cfg });
    expect(r.dayRewardCoins).toBe(20);    // 1 excluded day * finalizeDayReward(20)
    expect(s.coinsEarned).toBe(20);
  });

  it("reports only the damage it actually applied — excluded-day text is not counted", () => {
    const s = { ...defaultState(), lastSettledDate: "2026-06-06" };
    const cfg = { ...DEFAULT_CONFIG, excludedWeekdays: [0] };  // 2026-06-07 is a Sunday
    const map = {
      "2026-06-07": { tasks: [undoneMust(), undoneMust(), undoneMust()], vices: [] }, // 30 dmg, but excluded
      "2026-06-08": { tasks: [undoneMust()], vices: [] },                             // 10 dmg, applied
    };
    const r = settleDays({ fromISO: "2026-06-07", todayISO: "2026-06-09", noteResolver: resolverOf(map), state: s, config: cfg });
    expect(r.hpDamage).toBe(10);   // only the non-excluded day; the skipped day's 30 is ignored
  });

  it("is a no-op on an empty range and never moves lastSettledDate backward", () => {
    const s = { ...defaultState(), lastSettledDate: "2026-06-09" };
    const r = settleDays({ fromISO: "2026-06-10", todayISO: today, noteResolver: resolverOf({}), state: s, config: DEFAULT_CONFIG });
    expect(r.daysSettled).toBe(0);
    expect(r.missedDays).toBe(0);
    expect(s.lastSettledDate).toBe("2026-06-09");
  });
});

describe("formatSettlement", () => {
  it("summarizes a normal run", () => {
    const msg = formatSettlement({ daysSettled: 2, missedDays: 1, hpStart: 80, hpEnd: 65, tokensUsed: 1, setbackFired: false, streakBefore: 5, streakAfter: 7, newLastSettledDate: "2026-06-09", dayRewardCoins: 40, hpDamage: 15 });
    expect(msg).toContain("2 done, 1 missed");
    expect(msg).toContain("HP 80→65");
    expect(msg).toContain("🧊 1 used");
    expect(msg).toContain("🔥 streak 5→7");
  });
  it("reports an up-to-date no-op and a setback", () => {
    expect(formatSettlement({ daysSettled: 0, missedDays: 0, hpStart: 50, hpEnd: 50, tokensUsed: 0, setbackFired: false, streakBefore: 1, streakAfter: 1, newLastSettledDate: "x", dayRewardCoins: 0, hpDamage: 0 })).toContain("nothing to finalize");
    expect(formatSettlement({ daysSettled: 1, missedDays: 0, hpStart: 10, hpEnd: 100, tokensUsed: 0, setbackFired: true, streakBefore: 1, streakAfter: 2, newLastSettledDate: "x", dayRewardCoins: 20, hpDamage: 0 })).toContain("HP hit 0");
  });
});
