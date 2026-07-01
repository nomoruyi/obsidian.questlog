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
  hp: number;                             // current HP
  maxHP: number;                          // current cap (raisable by shop)
  dailyRegen: number;                     // current regen (raisable by shop)
  streak: number;                         // consecutive-day count
  lastSettledDate: string | null;         // ISO "YYYY-MM-DD"; null until first finalize
}

export function defaultState(): GameState {
  return {
    overallXp: 0, skills: {}, ledger: {}, coinsEarned: 0, coinsSpent: 0, inventory: {},
    hp: 100, maxHP: 100, dailyRegen: 10, streak: 0, lastSettledDate: null,
  };
}

export function balance(state: GameState): number {
  return Math.max(0, state.coinsEarned - state.coinsSpent);
}
