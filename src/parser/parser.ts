import { ParsedNote, ParsedTask, ParsedVice, Priority, Difficulty } from "../types";
import { PRIORITIES, DIFFICULTIES, isMetaTag } from "../tags/constants";

const CHECKBOX = /^(\s*)- \[( |x|X)\]\s+(.*)$/;
const HEADING = /^#{1,6}\s+(.*)$/;
const VICE = /^\s*-\s+(.+?):\s*(\d+)\b/;

interface RawTask extends ParsedTask { indent: number; ownDone: boolean; }

function indentWidth(spaces: string): number {
  let w = 0;
  for (const ch of spaces) w += ch === "\t" ? 4 : 1;
  return w;
}

function parseTags(body: string, allowedSkills?: string[]): {
  text: string; priority: Priority; difficulty: Difficulty; category: string; optional: boolean;
} {
  let priority: Priority = "should";
  let difficulty: Difficulty = "medium";
  let category = "general";
  let optional = false;
  let categorySet = false;

  // A tag is a "#…" only when preceded by whitespace or line start (Obsidian's
  // rule). This avoids matching heading links like [[#Missions]].
  const tokens: string[] = [];
  const tagRe = /(?:^|\s)#([\w/-]+)/g;
  let mt: RegExpExecArray | null;
  while ((mt = tagRe.exec(body)) !== null) tokens.push(mt[1]);
  for (const raw of tokens) {
    const t = raw.toLowerCase();
    if (t.startsWith("prio/")) {
      const v = t.slice(5) as Priority;
      if (PRIORITIES.includes(v)) priority = v;
    } else if (t.startsWith("diff/")) {
      const v = t.slice(5) as Difficulty;
      if (DIFFICULTIES.includes(v)) difficulty = v;
    } else if (t === "opt") {
      optional = true;
    } else if (isMetaTag(t)) {
      // reserved for later phases (vice / reward/* / target/*); not a category
    } else if (!categorySet && (!allowedSkills || allowedSkills.includes(t))) {
      // When a skills list is supplied it is the only source of categories:
      // tags outside it are ignored (the task keeps the "general" default).
      category = t;
      categorySet = true;
    }
  }

  const text = body.replace(/(^|\s)#[\w/-]+/g, "$1").replace(/\s+/g, " ").trim();
  return { text, priority, difficulty, category, optional };
}

function viceDifficulty(line: string): Difficulty {
  const m = line.toLowerCase().match(/(?:^|\s)#diff\/(easy|medium|hard)\b/);
  return (m?.[1] as Difficulty) ?? "medium";
}

export function parseNote(markdown: string, allowedSkills?: string[]): ParsedNote {
  const lines = markdown.split(/\r?\n/);
  const roots: RawTask[] = [];
  const stack: RawTask[] = [];
  const vices: ParsedVice[] = [];
  let section = "";

  for (const line of lines) {
    const h = line.match(HEADING);
    if (h) { section = h[1].trim().toLowerCase(); continue; }

    const m = line.match(CHECKBOX);
    if (!m) {
      if (/(?:^|\s)#vice\b/i.test(line)) {
        const v = line.match(VICE);
        if (v) vices.push({ label: v[1].trim(), count: parseInt(v[2], 10), difficulty: viceDifficulty(line) });
      }
      continue;
    }

    const indent = indentWidth(m[1]);
    const ownDone = m[2].toLowerCase() === "x";
    const tags = parseTags(m[3], allowedSkills);
    const task: RawTask = {
      ...tags, done: ownDone, ownDone, section, children: [], indent,
    };

    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    if (stack.length === 0) { roots.push(task); }
    else { stack[stack.length - 1].children.push(task); }
    stack.push(task);
  }

  const finalize = (t: RawTask): ParsedTask => {
    const children = (t.children as RawTask[]).map(finalize);
    const done = children.length > 0 ? children.every((c) => c.done) : t.ownDone;
    return {
      text: t.text, priority: t.priority, difficulty: t.difficulty,
      category: t.category, optional: t.optional, section: t.section,
      done, children,
    };
  };

  return { tasks: roots.map(finalize), vices };
}
