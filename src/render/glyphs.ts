import { Priority, Difficulty } from "../types";

export interface GlyphSpan { from: number; to: number; glyph: string; }

// A line is glyph-eligible when it is any "- " list bullet: checkbox tasks
// ("- [ ] …") AND plain bullets ("- Cigarettes: 3 #vice"), so vice lines get
// decorated too. Tags follow Obsidian's boundary rule (preceded by whitespace
// or line start). Mirrors the parser.
const LIST_LINE = /^\s*-\s+\S/;
const TAG = /(^|\s)#([\w/-]+)/g;

const PRIO_GLYPH: Record<Priority, string> = { must: "‼️", should: "❗", could: "❕" };
const DIFF_GLYPH: Record<Difficulty, string> = { easy: "🟢", medium: "🟡", hard: "🔴" };

// null => not glyph-eligible (unknown or note-level tag).
export function resolveGlyph(tagLower: string, skillGlyphs: Record<string, string>): string | null {
  if (tagLower.startsWith("prio/")) return PRIO_GLYPH[tagLower.slice(5) as Priority] ?? null;
  if (tagLower.startsWith("diff/")) return DIFF_GLYPH[tagLower.slice(5) as Difficulty] ?? null;
  if (tagLower === "opt") return "➕";
  if (tagLower === "vice") return "☠️";
  return skillGlyphs[tagLower] ?? null;
}

// Offset spans (within the line) for each glyph-eligible tag, in order.
export function glyphSpans(lineText: string, skillGlyphs: Record<string, string>): GlyphSpan[] {
  if (!LIST_LINE.test(lineText)) return [];
  const spans: GlyphSpan[] = [];
  TAG.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG.exec(lineText)) !== null) {
    const glyph = resolveGlyph(m[2].toLowerCase(), skillGlyphs);
    if (glyph === null) continue;
    const from = m.index + m[1].length;   // position of "#" (skip the boundary space)
    const to = from + 1 + m[2].length;    // end of "#tag"
    spans.push({ from, to, glyph });
  }
  return spans;
}
