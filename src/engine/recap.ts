import { ParsedNote } from "../types";
import { QuestLogConfig } from "../config";
import { SettlementResult } from "./settlement";
import { aggregateXp } from "./xp";
import { aggregateCoins } from "./coins";
import { levelForXp, rankForLevel } from "./levels";

export interface SkillLevelUp {
  skill: string;
  before: number;
  after: number;
}

export interface Recap {
  fromISO: string;
  toISO: string;
  daysSettled: number;
  missedDays: number;

  xpGained: number;
  coinsGained: number;
  dayRewardCoins: number;

  hpStart: number;
  hpEnd: number;
  hpRegen: number;
  hpDamage: number;
  setbackFired: boolean;

  tokensUsed: number;
  streakBefore: number;
  streakAfter: number;

  overallBefore: number;
  overallAfter: number;
  rankBefore: string;
  rankAfter: string;
  skillLevelUps: SkillLevelUp[];
}

export interface RecapArgs {
  fromISO: string;
  toISO: string;
  settledNotes: ParsedNote[];        // present days only (the note-map values)
  config: QuestLogConfig;
  overallXpAtStart: number;          // state.overallXp captured BEFORE settleDays (setback-proof)
  skillsXp: Record<string, number>;  // state.skills (settlement never mutates skill XP)
  dailyRegen: number;                // state.dailyRegen, for the regen display
  result: SettlementResult;          // from settleDays
}

export function buildRecap(args: RecapArgs): Recap {
  const { config, result } = args;
  const base = config.levelBase;
  const exp = config.levelExponent;

  let xpGained = 0;
  let coinsGained = 0;
  const perSkillGained: Record<string, number> = {};

  for (const note of args.settledNotes) {
    const xp = aggregateXp(note, config.xpGrid);
    xpGained += xp.overall;
    for (const [skill, amt] of Object.entries(xp.perSkill)) {
      perSkillGained[skill] = (perSkillGained[skill] ?? 0) + amt;
    }
    coinsGained += aggregateCoins(note, config.coinGrid);
  }

  const overallAfter = levelForXp(args.overallXpAtStart, base, exp);
  const overallBefore = levelForXp(args.overallXpAtStart - xpGained, base, exp);
  const rankAfter = rankForLevel(overallAfter, config.rankTitles);
  const rankBefore = rankForLevel(overallBefore, config.rankTitles);

  const skillLevelUps: SkillLevelUp[] = [];
  for (const [skill, gained] of Object.entries(perSkillGained)) {
    const curXp = args.skillsXp[skill] ?? 0;
    const after = levelForXp(curXp, base, exp);
    const before = levelForXp(curXp - gained, base, exp);
    if (after > before) skillLevelUps.push({ skill, before, after });
  }

  return {
    fromISO: args.fromISO,
    toISO: args.toISO,
    daysSettled: result.daysSettled,
    missedDays: result.missedDays,
    xpGained,
    coinsGained,
    dayRewardCoins: result.dayRewardCoins,
    hpStart: result.hpStart,
    hpEnd: result.hpEnd,
    hpRegen: result.daysSettled * args.dailyRegen,
    hpDamage: result.hpDamage,
    setbackFired: result.setbackFired,
    tokensUsed: result.tokensUsed,
    streakBefore: result.streakBefore,
    streakAfter: result.streakAfter,
    overallBefore,
    overallAfter,
    rankBefore,
    rankAfter,
    skillLevelUps,
  };
}
