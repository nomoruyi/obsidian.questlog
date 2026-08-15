import { ParsedNote, ParsedTask, Score } from "../types";

// Missions are one-off quests: they roll over instead of being owed on the day,
// so they are outside the daily obligation for both score and HP.
export function isMissionTask(task: ParsedTask, missionHeading: string): boolean {
  return missionHeading !== "" && task.section.includes(missionHeading);
}

export function computeScore(note: ParsedNote, missionHeading: string): Score {
  let done = 0, total = 0;
  for (const t of note.tasks) {
    if (isMissionTask(t, missionHeading)) continue;
    total++;
    if (t.done) done++;
  }
  return { done, total };
}
