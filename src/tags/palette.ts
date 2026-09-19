import { Priority, Difficulty } from "../types";
import { PRIORITIES, DIFFICULTIES } from "./constants";
import { missionSectionRange } from "../engine/missions";

// Zero indentation only: aggregateXp iterates top-level tasks, so a subtask's
// own tags never score anything — asking the user to set them would change
// nothing.
const CHECKBOX = /^- \[[ xX]\]\s+(.*)$/;

// Obsidian's tag rule: "#…" counts only after whitespace or line start, so
// [[#Missions]] is never a tag.
const TAG = /(?:^|\s)#([\w/-]+)/g;

export interface LineTags { prio: Priority; diff: Difficulty; cat: string; }

// The line's text with the checkbox marker and every tag removed.
export function questText(line: string): string {
  const m = line.match(CHECKBOX);
  const body = m === null ? line : m[1];
  return body.replace(TAG, "").replace(/\s+/g, " ").trim();
}

// True for a zero-indent, non-empty checkbox line missing at least one of
// priority, difficulty, or a configured category. Knows nothing about where the
// line sits in the document — sweepTargets owns that.
export function needsTags(line: string, skills: string[]): boolean {
  const m = line.match(CHECKBOX);
  if (m === null) return false;
  if (questText(line) === "") return false;

  let prio = false, diff = false, cat = false;
  for (const t of m[1].matchAll(TAG)) {
    const v = t[1].toLowerCase();
    if (v.startsWith("prio/")) prio = true;
    else if (v.startsWith("diff/")) diff = true;
    else if (skills.includes(v)) cat = true;
  }
  return !prio || !diff || !cat;
}

// Line indices to visit, in document order.
export function sweepTargets(lines: string[], missionHeading: string, skills: string[]): number[] {
  const range = missionSectionRange(lines, missionHeading);
  if (range === null) return [];

  const out: number[] = [];
  for (let i = range.start; i < range.end; i++) {
    if (needsTags(lines[i], skills)) out.push(i);
  }
  return out;
}

// The line's current tag values, falling back to the parser's own defaults so a
// bare line starts on what it is already silently scoring as. When "general" is
// not a configured skill the first skill stands in, so some chip is always
// highlighted.
export function currentTags(line: string, skills: string[]): LineTags {
  let prio: Priority = "should";
  let diff: Difficulty = "medium";
  let cat = skills.includes("general") ? "general" : (skills[0] ?? "general");
  let catSet = false;

  for (const m of line.matchAll(TAG)) {
    const v = m[1].toLowerCase();
    if (v.startsWith("prio/")) {
      const p = v.slice(5) as Priority;
      if (PRIORITIES.includes(p)) prio = p;
    } else if (v.startsWith("diff/")) {
      const d = v.slice(5) as Difficulty;
      if (DIFFICULTIES.includes(d)) diff = d;
    } else if (!catSet && skills.includes(v)) {
      cat = v;
      catSet = true;
    }
  }
  return { prio, diff, cat };
}

// Parallel to `names`: the shortest prefix of each name that no other name
// shares. A name that is itself a prefix of another (home / homework) has no
// such prefix and gets its full spelling — the palette's exact-match rule
// resolves that case at the keyboard. Derived rather than hardcoded so the
// category row has no fixed size limit.
export function uniquePrefixes(names: string[]): string[] {
  return names.map((name) => {
    const others = names.filter((n) => n !== name);
    for (let len = 1; len <= name.length; len++) {
      const p = name.slice(0, len);
      if (!others.some((o) => o.startsWith(p))) return p;
    }
    return name;
  });
}
