export function cumulativeXpForLevel(level: number, base: number, exp: number): number {
  if (level <= 1) return 0;
  return Math.round(base * Math.pow(level - 1, exp));
}

export function levelForXp(xp: number, base: number, exp: number): number {
  let level = 1;
  while (cumulativeXpForLevel(level + 1, base, exp) <= xp) level++;
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
