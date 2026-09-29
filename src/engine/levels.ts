export function cumulativeXpForLevel(level: number, base: number, exp: number): number {
  if (level <= 1) return 0;
  return Math.round(base * Math.pow(level - 1, exp));
}

// Curves the settings tab will accept. Below 1 the curve flattens until
// thousands of levels share one XP total, which is meaningless and makes the
// inverse below ill-conditioned; above 5 a single level outgrows a lifetime.
export const MIN_LEVEL_EXPONENT = 1;
export const MAX_LEVEL_EXPONENT = 5;

export function levelForXp(xp: number, base: number, exp: number): number {
  if (!(xp > 0) || !(base > 0) || !(exp > 0)) return 1;
  // Closed-form inverse of cumulativeXpForLevel. Scanning up from level 1 costs
  // (xp/base)^(1/exp) iterations — ~1e10 of them on a sub-1 exponent — and this
  // runs on every status-bar update and every note render.
  const estimate = Math.pow(xp / base, 1 / exp);
  if (!Number.isFinite(estimate)) return 1;
  let level = Math.max(1, Math.floor(estimate) + 1);
  // cumulativeXpForLevel rounds, so the estimate can land a step either side.
  // Bounded so a flat curve cannot turn the correction back into a scan.
  for (let i = 0; i < 4 && level > 1 && cumulativeXpForLevel(level, base, exp) > xp; i++) level--;
  for (let i = 0; i < 4 && cumulativeXpForLevel(level + 1, base, exp) <= xp; i++) level++;
  return level;
}

export interface LevelProgress { level: number; into: number; needed: number; }

export function levelProgress(xp: number, base: number, exp: number): LevelProgress {
  const level = levelForXp(xp, base, exp);
  const cur = cumulativeXpForLevel(level, base, exp);
  const next = cumulativeXpForLevel(level + 1, base, exp);
  return { level, into: xp - cur, needed: next - cur };
}

export function rankForLevel(level: number, titles: string[]): string {
  const idx = Math.min(Math.floor((level - 1) / 10), titles.length - 1);
  return titles[idx];
}

// Pacing estimate for the settings readout: what `level` costs from zero, and
// how long that takes at `avgDailyXp`. days is null when there is no pace yet.
export function levelEta(level: number, base: number, exp: number, avgDailyXp: number): { totalXp: number; days: number | null } {
  const totalXp = cumulativeXpForLevel(level, base, exp);
  return { totalXp, days: avgDailyXp > 0 ? Math.ceil(totalXp / avgDailyXp) : null };
}
