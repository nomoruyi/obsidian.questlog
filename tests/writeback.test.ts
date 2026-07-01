import { describe, it, expect } from "vitest";
import { upsertQuestLogBlock, buildScoreBlock } from "../src/vault/writeback";

describe("writeback", () => {
  it("builds a score block", () => {
    expect(buildScoreBlock({ done: 18, total: 22 }, 90, 12)).toBe("##### Score: 18/22 · +90 XP · 🪙 12");
  });

  it("appends the block when absent", () => {
    const out = upsertQuestLogBlock("# Daily\n- [ ] task", "##### Score: 1/2 · +50 XP");
    expect(out).toContain("%% ql:start %%");
    expect(out).toContain("##### Score: 1/2 · +50 XP");
    expect(out).toContain("%% ql:end %%");
  });

  it("replaces an existing block (idempotent, no duplicates)", () => {
    const first = upsertQuestLogBlock("# Daily", "##### Score: 1/2 · +50 XP");
    const second = upsertQuestLogBlock(first, "##### Score: 2/2 · +90 XP");
    expect(second.match(/ql:start/g)).toHaveLength(1);
    expect(second).toContain("2/2 · +90 XP");
    expect(second).not.toContain("1/2 · +50 XP");
  });
});
