import { ParsedNote, ParsedTask } from "../types";
import { Grid } from "../config";

export interface XpResult {
  overall: number;
  perSkill: Record<string, number>;
}

export function taskXp(task: ParsedTask, grid: Grid): number {
  return task.done ? grid[task.priority][task.difficulty] : 0;
}

export function aggregateXp(note: ParsedNote, grid: Grid): XpResult {
  const perSkill: Record<string, number> = {};
  let overall = 0;
  for (const t of note.tasks) {
    const xp = taskXp(t, grid);
    if (xp === 0) continue;
    overall += xp;
    perSkill[t.category] = (perSkill[t.category] ?? 0) + xp;
  }
  return { overall, perSkill };
}
