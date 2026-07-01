import { ParsedNote, Score } from "../types";

export function computeScore(note: ParsedNote, missionHeading: string): Score {
  let done = 0, total = 0;
  for (const t of note.tasks) {
    if (t.optional) continue;
    if (missionHeading && t.section.includes(missionHeading)) continue;
    total++;
    if (t.done) done++;
  }
  return { done, total };
}
