import { GameState, Contribution } from "./state";

export function applyContribution(state: GameState, key: string, next: Contribution): GameState {
  const prev = state.ledger[key];
  if (prev) {
    state.overallXp -= prev.overallXp;
    state.coinsEarned -= prev.coins ?? 0;
    for (const [skill, v] of Object.entries(prev.perSkill)) {
      state.skills[skill] = (state.skills[skill] ?? 0) - v;
    }
  }
  state.overallXp += next.overallXp;
  state.coinsEarned += next.coins ?? 0;
  for (const [skill, v] of Object.entries(next.perSkill)) {
    state.skills[skill] = (state.skills[skill] ?? 0) + v;
  }
  state.ledger[key] = next;

  if (state.overallXp < 0) state.overallXp = 0;
  if (state.coinsEarned < 0) state.coinsEarned = 0;
  for (const skill of Object.keys(state.skills)) {
    if (state.skills[skill] < 0) state.skills[skill] = 0;
  }
  return state;
}

// Subtracts a note's prior contribution and drops it from the ledger entirely.
// Used when a note loses (or never had) the quest marker so it stops counting.
export function removeContribution(state: GameState, key: string): GameState {
  const prev = state.ledger[key];
  if (!prev) return state;
  state.overallXp -= prev.overallXp;
  state.coinsEarned -= prev.coins ?? 0;
  for (const [skill, v] of Object.entries(prev.perSkill)) {
    state.skills[skill] = (state.skills[skill] ?? 0) - v;
  }
  delete state.ledger[key];

  if (state.overallXp < 0) state.overallXp = 0;
  if (state.coinsEarned < 0) state.coinsEarned = 0;
  for (const skill of Object.keys(state.skills)) {
    if (state.skills[skill] < 0) state.skills[skill] = 0;
  }
  return state;
}
