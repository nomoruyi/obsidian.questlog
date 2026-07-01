import { ParsedNote, ParsedTask } from "../types";
import { Grid } from "../config";

export function taskCoins(task: ParsedTask, grid: Grid): number {
  return task.done ? grid[task.priority][task.difficulty] : 0;
}

export function aggregateCoins(note: ParsedNote, grid: Grid): number {
  let total = 0;
  for (const t of note.tasks) total += taskCoins(t, grid);
  return total;
}
