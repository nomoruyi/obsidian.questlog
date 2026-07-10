import { GameState } from "../state/state";
import { QuestLogConfig } from "../config";
import { ParsedNote } from "../types";
import { aggregateDayDamage, applyDay } from "./hp";
import { applySetback } from "./setback";

export type NoteResolver = (dateISO: string) => ParsedNote | null;

export interface SettlementArgs {
  fromISO: string;       // first day to consider (lastSettledDate + 1)
  todayISO: string;      // exclusive upper bound (today is still live)
  noteResolver: NoteResolver;
  state: GameState;      // mutated in place
  config: QuestLogConfig;
}

export interface SettlementResult {
  daysSettled: number;
  missedDays: number;
  hpStart: number;
  hpEnd: number;
  tokensUsed: number;
  setbackFired: boolean;
  streakBefore: number;
  streakAfter: number;
  newLastSettledDate: string;
  dayRewardCoins: number;
}

// ISO date helpers (UTC, so no DST drift). ISO strings sort chronologically.
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

export function enumerateDates(fromISO: string, toISO: string): string[] {
  const out: string[] = [];
  let cur = fromISO;
  while (cur <= toISO) { out.push(cur); cur = addDays(cur, 1); }
  return out;
}

function maxIso(a: string | null, b: string): string {
  if (!a) return b;
  return a >= b ? a : b;
}

function consumeFreeze(state: GameState, n: number): void {
  if (n <= 0) return;
  const have = state.inventory["freeze"] ?? 0;
  const left = have - n;
  if (left <= 0) delete state.inventory["freeze"];
  else state.inventory["freeze"] = left;
}

export function settleDays(args: SettlementArgs): SettlementResult {
  const { fromISO, todayISO, noteResolver, state, config } = args;
  const lastDay = addDays(todayISO, -1); // exclusive of today
  const hpStart = state.hp;
  const streakBefore = state.streak;

  const dates = enumerateDates(fromISO, lastDay);

  if (dates.length === 0) {
    const newLast = maxIso(state.lastSettledDate, lastDay);
    state.lastSettledDate = newLast;
    return {
      daysSettled: 0, missedDays: 0, hpStart, hpEnd: state.hp, tokensUsed: 0,
      setbackFired: false, streakBefore, streakAfter: state.streak, newLastSettledDate: newLast,
      dayRewardCoins: 0,
    };
  }

  let daysSettled = 0;
  let missedDays = 0;
  let setbackFired = false;

  for (const date of dates) {
    const note = noteResolver(date);
    if (note === null) { missedDays++; continue; }
    daysSettled++;
    if (config.hpEnabled) {
      const damage = aggregateDayDamage(note, config);
      const { hp, hitZero } = applyDay(state.hp, state.maxHP, state.dailyRegen, damage);
      state.hp = hp;
      if (hitZero && applySetback(state, config)) setbackFired = true;
    }
  }

  let tokensUsed = 0;
  if (config.streakEnabled) {
    const tokens = state.inventory["freeze"] ?? 0;
    if (tokens >= missedDays) {
      tokensUsed = missedDays;
      consumeFreeze(state, tokensUsed);
      state.streak += daysSettled;
    } else {
      tokensUsed = tokens;
      consumeFreeze(state, tokensUsed);
      state.streak = 0;
    }
  }

  const newLast = maxIso(state.lastSettledDate, lastDay);
  state.lastSettledDate = newLast;

  const dayRewardCoins = config.finalizeDayReward * daysSettled;
  state.coinsEarned += dayRewardCoins;

  return {
    daysSettled, missedDays, hpStart, hpEnd: state.hp, tokensUsed,
    setbackFired, streakBefore, streakAfter: state.streak, newLastSettledDate: newLast,
    dayRewardCoins,
  };
}

export function formatSettlement(r: SettlementResult): string {
  if (r.daysSettled === 0 && r.missedDays === 0) {
    return "QuestLog: nothing to finalize — already up to date.";
  }
  const parts = [`Finalized ${r.daysSettled + r.missedDays} day(s): ${r.daysSettled} done, ${r.missedDays} missed`];
  if (r.hpStart !== r.hpEnd) parts.push(`HP ${r.hpStart}→${r.hpEnd}`);
  if (r.tokensUsed > 0) parts.push(`🧊 ${r.tokensUsed} used`);
  if (r.streakBefore !== r.streakAfter) parts.push(`🔥 streak ${r.streakBefore}→${r.streakAfter}`);
  let msg = parts.join(" · ");
  if (r.setbackFired) msg += " · ⚠️ HP hit 0 — XP reset to level floor";
  return msg;
}
