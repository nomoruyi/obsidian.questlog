import { Score } from "../types";

const START = "%% ql:start %%";
const END = "%% ql:end %%";

export function buildScoreBlock(score: Score, xp: number, coins: number): string {
  return `##### Score: ${score.done}/${score.total} · +${xp} XP · 🪙 ${coins}`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function upsertQuestLogBlock(content: string, block: string): string {
  const wrapped = `${START}\n${block}\n${END}`;
  const re = new RegExp(`${escapeRegex(START)}[\\s\\S]*?${escapeRegex(END)}`);
  if (re.test(content)) return content.replace(re, wrapped);
  return `${content.trimEnd()}\n\n${wrapped}\n`;
}
