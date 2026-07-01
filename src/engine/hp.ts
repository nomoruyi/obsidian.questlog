import { ParsedNote, ParsedTask, Difficulty } from "../types";
import { QuestLogConfig } from "../config";

export function viceLoss(count: number, difficulty: Difficulty, cfg: QuestLogConfig): number {
  return count * cfg.viceLoss[difficulty];
}

export function taskHpPenalty(task: ParsedTask, cfg: QuestLogConfig): number {
  return task.done ? 0 : cfg.undonePenalty[task.priority];
}

export function aggregateDayDamage(note: ParsedNote, cfg: QuestLogConfig): number {
  let dmg = 0;
  for (const t of note.tasks) dmg += taskHpPenalty(t, cfg);
  for (const v of note.vices) dmg += viceLoss(v.count, v.difficulty, cfg);
  return dmg;
}

export interface DayHp { hp: number; hitZero: boolean; }

export function applyDay(hp: number, maxHP: number, regen: number, damage: number): DayHp {
  let next = hp + regen - damage;
  if (next < 0) next = 0;
  if (next > maxHP) next = maxHP;
  return { hp: next, hitZero: next === 0 };
}
