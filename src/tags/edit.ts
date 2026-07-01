import { isMetaTag } from "./constants";

// A tag is a "#…" only when preceded by whitespace or line start (Obsidian's
// rule). This keeps heading links like [[#Missions]] from being treated as tags.
// The boundary is greedy (\s+) so removing a tag also takes ALL its leading
// whitespace, keeping the two-space separation clean when a middle tag is replaced.
const TAG = /(^|\s+)#([\w/-]+)/g;

// Appended tags are prefixed with two spaces for better in-note visibility, so a
// run of tags reads as "task  #prio/must  #diff/easy  #body".
function appendTag(line: string, tag: string): string {
  return `${line.trimEnd()}  #${tag}`;
}

// Remove every "#…" tag whose lowercased value matches `predicate`, taking the
// preceding boundary space with it so no double spaces are left behind.
function removeTags(line: string, predicate: (valueLower: string) => boolean): string {
  return line
    .replace(TAG, (whole, _boundary: string, value: string) =>
      predicate(value.toLowerCase()) ? "" : whole,
    )
    .replace(/[ \t]+$/, "");
}

export function setPrefixedTag(line: string, prefix: "prio" | "diff", value: string): string {
  const cleaned = removeTags(line, (v) => v.startsWith(`${prefix}/`));
  return appendTag(cleaned, `${prefix}/${value}`);
}

export function setCategory(line: string, category: string): string {
  // The existing category is the first non-meta tag (mirrors the parser).
  let existing: string | null = null;
  for (const m of line.matchAll(TAG)) {
    const value = m[2];
    if (!isMetaTag(value.toLowerCase())) { existing = value.toLowerCase(); break; }
  }
  const cleaned = existing === null ? line : removeTags(line, (v) => v === existing);
  return appendTag(cleaned, category);
}

export function hasOptional(line: string): boolean {
  for (const m of line.matchAll(TAG)) {
    if (m[2].toLowerCase() === "opt") return true;
  }
  return false;
}

export function toggleOptional(line: string): string {
  return hasOptional(line) ? removeTags(line, (v) => v === "opt") : appendTag(line, "opt");
}

export function hasVice(line: string): boolean {
  for (const m of line.matchAll(TAG)) {
    if (m[2].toLowerCase() === "vice") return true;
  }
  return false;
}

export function toggleVice(line: string): string {
  return hasVice(line) ? removeTags(line, (v) => v === "vice") : appendTag(line, "vice");
}

// Reorder a line's tags into the canonical order: prio → diff → cat → opt →
// vice, with any unrecognized tags (and reserved reward/*/target/*) kept last in
// their original relative order. Tag case is preserved; separators normalize to
// the two-space house style. Lines without tags are returned unchanged, and
// [[#wikilinks]] are never treated as tags (Obsidian's boundary rule).
export function normalizeTagOrder(line: string, skills: string[]): string {
  const prio: string[] = [];
  const diff: string[] = [];
  const opt: string[] = [];
  const vice: string[] = [];
  const others: string[] = [];
  let cat: string | null = null;

  for (const m of line.matchAll(TAG)) {
    const value = m[2];
    const lower = value.toLowerCase();
    if (lower.startsWith("prio/")) prio.push(value);
    else if (lower.startsWith("diff/")) diff.push(value);
    else if (lower === "opt") opt.push(value);
    else if (lower === "vice") vice.push(value);
    else if (isMetaTag(lower)) others.push(value); // reward/*, target/* (reserved)
    else if (cat === null && skills.includes(lower)) cat = value;
    else others.push(value);
  }

  const ordered = [
    ...prio, ...diff, ...(cat !== null ? [cat] : []), ...opt, ...vice, ...others,
  ];
  if (ordered.length === 0) return line;

  const base = line.replace(TAG, "").replace(/[ \t]+$/, "");
  let out = base;
  for (const value of ordered) out = `${out}  #${value}`;
  return out;
}
