// Pure mission-rollover engine. Operates on raw markdown lines so tags,
// nesting and inline text are preserved verbatim. No Obsidian imports.

import { missionSectionRange } from "./missions";

export interface MissionBlock {
  lines: string[]; // the mission line plus all its descendant lines, raw
  text: string;    // normalized identity of the top line, for dedup
}

export interface RolloverResult {
  markdown: string;
  inserted: number;
  skipped: number;
  headingMissing: boolean;
}

const CHECKBOX = /^(\s*)- \[( |x|X)\]\s+(.*)$/;

function indentWidth(spaces: string): number {
  let w = 0;
  for (const ch of spaces) w += ch === "\t" ? 4 : 1;
  return w;
}

// Strip the checkbox marker, collapse whitespace, lowercase. Tags are kept so
// two missions that differ only by tags are distinct identities.
function normalizeText(line: string): string {
  return line
    .replace(/^\s*- \[[ xX]\]\s+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// A block is done iff every LEAF checkbox is checked (mirrors the parser:
// a parent with children is done iff all leaf descendants are checked).
function blockDone(blockLines: string[]): boolean {
  const cbs: { indent: number; checked: boolean }[] = [];
  for (const l of blockLines) {
    const m = l.match(CHECKBOX);
    if (m) cbs.push({ indent: indentWidth(m[1]), checked: m[2].toLowerCase() === "x" });
  }
  if (cbs.length === 0) return false;
  for (let k = 0; k < cbs.length; k++) {
    const hasChild = k + 1 < cbs.length && cbs[k + 1].indent > cbs[k].indent;
    if (!hasChild && !cbs[k].checked) return false; // an unchecked leaf
  }
  return true;
}

export function extractUnfinishedMissions(markdown: string, missionHeading: string): MissionBlock[] {
  const lines = markdown.split(/\r?\n/);
  const range = missionSectionRange(lines, missionHeading);
  if (range === null) return [];
  const blocks: MissionBlock[] = [];

  let i = range.start;
  while (i < range.end) {
    const m = lines[i].match(CHECKBOX);
    if (!m) { i++; continue; }

    const baseIndent = indentWidth(m[1]);
    const blockLines = [lines[i]];
    let j = i + 1;
    while (j < range.end) {
      const next = lines[j];
      const nm = next.match(CHECKBOX);
      if (nm) {
        if (indentWidth(nm[1]) <= baseIndent) break; // sibling/dedent ends the block
        blockLines.push(next); j++; continue;
      }
      if (next.trim() === "") break; // blank line ends the block
      if (indentWidth(next.match(/^(\s*)/)![1]) > baseIndent) { blockLines.push(next); j++; continue; }
      break;
    }

    if (!blockDone(blockLines)) blocks.push({ lines: blockLines, text: normalizeText(blockLines[0]) });
    i = j;
  }
  return blocks;
}

export function insertMissions(todayMd: string, missionHeading: string, blocks: MissionBlock[]): RolloverResult {
  const lines = todayMd.split(/\r?\n/);

  const range = missionSectionRange(lines, missionHeading);
  if (range === null) return { markdown: todayMd, inserted: 0, skipped: 0, headingMissing: true };

  const present = new Set<string>();
  for (let i = range.start; i < range.end; i++) {
    if (CHECKBOX.test(lines[i])) present.add(normalizeText(lines[i]));
  }

  // Rolled missions go at the top of the section, immediately below the heading.
  const insertAt = range.start;

  const toInsert: string[] = [];
  let inserted = 0, skipped = 0;
  for (const b of blocks) {
    if (present.has(b.text)) { skipped++; continue; }
    present.add(b.text);
    toInsert.push(...b.lines);
    inserted++;
  }
  if (inserted === 0) return { markdown: todayMd, inserted: 0, skipped, headingMissing: false };

  const out = [...lines.slice(0, insertAt), ...toInsert, ...lines.slice(insertAt)];
  return { markdown: out.join("\n"), inserted, skipped, headingMissing: false };
}
