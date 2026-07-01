import { Recap } from "./recap";

export type CelebrationTier = "none" | "level" | "rank";

export interface ConfettiBurst {
  delayMs: number;
  particleCount: number;
  spread: number;
  startVelocity: number;
  angle: number;
  origin: { x: number; y: number };
  colors?: string[];
}

export interface SfxNote {
  freq: number;
  durationMs: number;
}

// Fires exactly when RecapModal's "Level-ups" section is non-empty. A rank
// change wins over a plain level-up. A level-floor setback drops overallAfter
// below overallBefore, which (absent a skill level-up) yields "none".
export function planCelebration(recap: Recap): CelebrationTier {
  if (recap.rankBefore !== recap.rankAfter) return "rank";
  if (recap.overallAfter > recap.overallBefore || recap.skillLevelUps.length > 0) return "level";
  return "none";
}

export function confettiPlan(tier: CelebrationTier): ConfettiBurst[] {
  if (tier === "level") {
    return [
      { delayMs: 0, particleCount: 120, spread: 70, startVelocity: 45, angle: 90, origin: { x: 0.5, y: 0.6 } },
    ];
  }
  if (tier === "rank") {
    return [
      { delayMs: 0,   particleCount: 140, spread: 60,  startVelocity: 55, angle: 60,  origin: { x: 0, y: 0.65 } },
      { delayMs: 150, particleCount: 140, spread: 60,  startVelocity: 55, angle: 120, origin: { x: 1, y: 0.65 } },
      { delayMs: 300, particleCount: 180, spread: 100, startVelocity: 45, angle: 90,  origin: { x: 0.5, y: 0.5 }, colors: ["#FFD700", "#FFA500", "#FFEC8B"] },
    ];
  }
  return [];
}

export function sfxSequence(tier: CelebrationTier): SfxNote[] {
  if (tier === "level") {
    return [
      { freq: 523, durationMs: 140 },  // C5
      { freq: 659, durationMs: 140 },  // E5
      { freq: 784, durationMs: 140 },  // G5
      { freq: 1047, durationMs: 140 }, // C6
    ];
  }
  if (tier === "rank") {
    return [
      { freq: 523, durationMs: 120 },  // C5
      { freq: 659, durationMs: 120 },  // E5
      { freq: 784, durationMs: 120 },  // G5
      { freq: 1047, durationMs: 120 }, // C6
      { freq: 1319, durationMs: 120 }, // E6
      { freq: 1568, durationMs: 400 }, // G6 (sustained)
    ];
  }
  return [];
}
