import { describe, it, expect } from "vitest";
import { parseNote } from "../src/parser/parser";
import { computeScore } from "../src/engine/scoring";

describe("computeScore", () => {
  it("counts non-optional, non-mission top-level tasks", () => {
    const md = `### Missions
- [x] Quest A #prio/must
### Must Do
- [x] Done one #prio/must
- [ ] Not done #prio/must
- [x] Optional but done #opt #prio/should`;
    const score = computeScore(parseNote(md), "mission");
    // missions excluded; optional excluded → total 2, done 1
    expect(score).toEqual({ done: 1, total: 2 });
  });

  it("treats a rolled-up parent as one unit", () => {
    const md = `- [ ] Laundry #prio/must
    - [x] Wash
    - [x] Hang`;
    expect(computeScore(parseNote(md), "mission")).toEqual({ done: 1, total: 1 });
  });
});
