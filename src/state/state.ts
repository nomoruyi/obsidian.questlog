import { Score } from "../types";

export interface Contribution {
  overallXp: number;
  perSkill: Record<string, number>;
  score: Score;
  coins?: number; // coins this note contributes; absent on pre-2B-1 ledger entries (treated as 0)
}

export interface GameState {
  overallXp: number;
  skills: Record<string, number>;        // xp per skill key
  ledger: Record<string, Contribution>;  // key = note path
  coinsEarned: number;                    // delta-applied per note, clamp >= 0
  coinsSpent: number;                     // increments on buy, never auto-decreases
  inventory: Record<string, number>;      // itemId -> count (key deleted at 0)
  purchases: Record<string, number>;      // itemId -> lifetime buy count; never decreases
  hp: number;                             // current HP
  maxHP: number;                          // current cap (raisable by shop)
  dailyRegen: number;                     // current regen (raisable by shop)
  streak: number;                         // consecutive-day count
  longestStreak: number;                  // best streak ever reached; never decreases
  lastSettledDate: string | null;         // ISO "YYYY-MM-DD"; null until first finalize
}

export function defaultState(): GameState {
  return {
    overallXp: 0, skills: {}, ledger: {}, coinsEarned: 0, coinsSpent: 0, inventory: {}, purchases: {},
    hp: 100, maxHP: 100, dailyRegen: 10, streak: 0, longestStreak: 0, lastSettledDate: null,
  };
}

export function balance(state: GameState): number {
  return Math.max(0, state.coinsEarned - state.coinsSpent);
}

// Mean XP across the given ledger entries, for the settings pacing readout.
// Per note, not per calendar day: a day with no note has no entry, so it does
// not count. Callers pass only the notes whose cadence they mean.
export function avgXpPerNote(entries: Contribution[]): number {
  if (entries.length === 0) return 0;
  const total = entries.reduce((sum, c) => sum + c.overallXp, 0);
  return Math.round(total / entries.length);
}
