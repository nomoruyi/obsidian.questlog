import { GameState } from "../state/state";
import { QuestLogConfig } from "../config";
import { cumulativeXpForLevel, levelForXp, levelProgress } from "./levels";

export function floorXpForLevel(xp: number, base: number, exp: number): number {
  return cumulativeXpForLevel(levelForXp(xp, base, exp), base, exp);
}

// Applies the configured setback to `state` and refills HP. Returns true when a
// penalty was applied (false for "off" mode, which is a soft wall: HP stays put).
export function applySetback(state: GameState, cfg: QuestLogConfig): boolean {
  if (cfg.setbackMode === "off") return false;

  if (cfg.setbackMode === "level-floor") {
    state.overallXp = floorXpForLevel(state.overallXp, cfg.levelBase, cfg.levelExponent);
  } else {
    const prog = levelProgress(state.overallXp, cfg.levelBase, cfg.levelExponent);
    const lost = Math.round(prog.into * (cfg.setbackPercent / 100));
    state.overallXp -= lost;
    if (state.overallXp < 0) state.overallXp = 0;
  }

  state.hp = state.maxHP;
  return true;
}
