import { describe, it, expect } from "vitest";
import { viceLoss, taskHpPenalty, aggregateDayDamage, applyDay } from "../src/engine/hp";
import { DEFAULT_CONFIG } from "../src/config";
import { ParsedNote, ParsedTask } from "../src/types";

const cfg = DEFAULT_CONFIG;

function task(p: ParsedTask["priority"], done: boolean): ParsedTask {
  return { text: "", done, priority: p, difficulty: "medium", category: "general", optional: false, section: "", children: [] };
}

describe("viceLoss", () => {
  it("inverts difficulty (hard cheapest, easy dearest) and scales by count", () => {
    expect(viceLoss(1, "hard", cfg)).toBe(5);
    expect(viceLoss(1, "medium", cfg)).toBe(10);
    expect(viceLoss(1, "easy", cfg)).toBe(20);
    expect(viceLoss(3, "medium", cfg)).toBe(30);
  });
});

describe("taskHpPenalty", () => {
  it("charges undone tasks by priority and done tasks nothing", () => {
    expect(taskHpPenalty(task("must", false), cfg)).toBe(10);
    expect(taskHpPenalty(task("should", false), cfg)).toBe(5);
    expect(taskHpPenalty(task("could", false), cfg)).toBe(0);
    expect(taskHpPenalty(task("must", true), cfg)).toBe(0);
  });
});

describe("aggregateDayDamage", () => {
  it("sums undone task penalties and vice losses", () => {
    const note: ParsedNote = {
      tasks: [task("must", false), task("should", true), task("should", false)],
      vices: [{ label: "Smoke", count: 2, difficulty: "medium" }],
    };
    // undone: 10 (must) + 5 (should) = 15 ; vice: 2*10 = 20 => 35
    expect(aggregateDayDamage(note, cfg)).toBe(35);
  });
});

describe("applyDay", () => {
  it("nets regen minus damage and clamps to [0, maxHP] with a hitZero flag", () => {
    expect(applyDay(80, 100, 10, 5)).toEqual({ hp: 85, hitZero: false });
    expect(applyDay(95, 100, 10, 0)).toEqual({ hp: 100, hitZero: false }); // clamp to max
    expect(applyDay(10, 100, 10, 30)).toEqual({ hp: 0, hitZero: true });   // clamp to 0
  });
});
