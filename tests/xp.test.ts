import { describe, it, expect } from "vitest";
import { parseNote } from "../src/parser/parser";
import { aggregateXp, taskXp } from "../src/engine/xp";
import { DEFAULT_CONFIG } from "../src/config";

const grid = DEFAULT_CONFIG.xpGrid;

describe("xp", () => {
  it("taskXp uses the grid and returns 0 for undone tasks", () => {
    const done = parseNote(`- [x] X #prio/must #diff/hard`).tasks[0];
    const undone = parseNote(`- [ ] X #prio/must #diff/hard`).tasks[0];
    expect(taskXp(done, grid)).toBe(100);
    expect(taskXp(undone, grid)).toBe(0);
  });

  it("aggregates overall and per-skill XP from completed top-level tasks", () => {
    const md = `- [x] A #prio/must #diff/medium #body
- [x] B #prio/should #diff/easy #mind
- [ ] C #prio/must #diff/hard #body`;
    const res = aggregateXp(parseNote(md), grid);
    expect(res.overall).toBe(70 + 20);          // C undone
    expect(res.perSkill).toEqual({ body: 70, mind: 20 });
  });
});
