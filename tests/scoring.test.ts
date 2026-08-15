import { describe, it, expect } from "vitest";
import { parseNote } from "../src/parser/parser";
import { computeScore } from "../src/engine/scoring";

describe("computeScore", () => {
  it("counts every non-mission top-level task, including could", () => {
    const md = `### Missions
- [x] Quest A #prio/must
### Must Do
- [x] Done one #prio/must
- [ ] Not done #prio/must
### Could Do
- [ ] Water plants #prio/could`;
    const score = computeScore(parseNote(md), "mission");
    // missions excluded → total 3, done 1
    expect(score).toEqual({ done: 1, total: 3 });
  });

  it("treats a rolled-up parent as one unit", () => {
    const md = `- [ ] Laundry #prio/must
    - [x] Wash
    - [x] Hang`;
    expect(computeScore(parseNote(md), "mission")).toEqual({ done: 1, total: 1 });
  });
});
