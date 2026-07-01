import { describe, it, expect } from "vitest";
import { parseNote } from "../src/parser/parser";
import { taskCoins, aggregateCoins } from "../src/engine/coins";
import { DEFAULT_CONFIG } from "../src/config";

const grid = DEFAULT_CONFIG.coinGrid;

describe("coins", () => {
  it("taskCoins reads the inverted grid and returns 0 for undone tasks", () => {
    const done = parseNote(`- [x] X #prio/could #diff/hard`).tasks[0];
    const undone = parseNote(`- [ ] X #prio/could #diff/hard`).tasks[0];
    expect(taskCoins(done, grid)).toBe(9);
    expect(taskCoins(undone, grid)).toBe(0);
  });

  it("aggregateCoins sums done top-level tasks as a flat number", () => {
    const md = `- [x] A #prio/must #diff/easy
- [x] B #prio/could #diff/hard
- [ ] C #prio/should #diff/medium`;
    expect(aggregateCoins(parseNote(md), grid)).toBe(1 + 9);
  });

  it("aggregateCoins is 0 when nothing is done", () => {
    expect(aggregateCoins(parseNote(`- [ ] A #prio/must #diff/hard`), grid)).toBe(0);
  });
});
