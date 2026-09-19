// Where the missions section lives in a note. Shared by the rollover engine and
// the tag palette's sweep so the two can never disagree about the boundary.
// Pure: no Obsidian imports.

const HEADING = /^#{1,6}\s+(.*)$/;
const RULE = /^\s*-{3,}\s*$/;

// Half-open [start, end) over the line array; `start` is the first line AFTER
// the heading.
export interface SectionRange { start: number; end: number; }

// The first heading whose lowercased text contains `missionHeading`, running
// until the next heading of ANY level or a "---" rule, whichever comes first.
// Level-agnostic on purpose: the daily template's heading depth has already
// moved once, and the boundary must survive the next restructure.
//
// An empty `missionHeading` disables the concept entirely (mirrors
// isMissionTask in engine/scoring.ts), so it yields null rather than matching
// the first heading in the note.
export function missionSectionRange(lines: string[], missionHeading: string): SectionRange | null {
  const needle = missionHeading.trim().toLowerCase();
  if (needle === "") return null;

  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(HEADING);
    if (h && h[1].trim().toLowerCase().includes(needle)) { start = i + 1; break; }
  }
  if (start === -1) return null;

  for (let i = start; i < lines.length; i++) {
    if (HEADING.test(lines[i]) || RULE.test(lines[i])) return { start, end: i };
  }
  return { start, end: lines.length };
}
