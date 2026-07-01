import { describe, it, expect } from "vitest";
import { extractUnfinishedMissions, insertMissions } from "../src/engine/rollover";

const SRC = [
  "# Mission",
  "- [ ] Meditate #must #easy",
  "- [x] Read #should",
  "- [ ] Workout #body",
  "    - [x] Warmup",
  "    - [ ] Main set",
  "- [ ] Tidy #home",
  "    - [x] Kitchen",
  "    - [x] Desk",
  "",
  "# Quests",
  "- [ ] Not a mission",
].join("\n");

describe("extractUnfinishedMissions", () => {
  it("keeps only unfinished missions using the leaf-done rule", () => {
    const blocks = extractUnfinishedMissions(SRC, "mission");
    // Meditate (unchecked), Workout (one child unchecked) kept;
    // Read (checked) and Tidy (all children checked) dropped.
    expect(blocks.map((b) => b.lines[0])).toEqual([
      "- [ ] Meditate #must #easy",
      "- [ ] Workout #body",
    ]);
  });

  it("preserves raw descendant lines, indentation and tags verbatim", () => {
    const blocks = extractUnfinishedMissions(SRC, "mission");
    const workout = blocks.find((b) => b.lines[0].includes("Workout"))!;
    expect(workout.lines).toEqual([
      "- [ ] Workout #body",
      "    - [x] Warmup",
      "    - [ ] Main set",
    ]);
  });

  it("ignores checkboxes outside any mission section", () => {
    const blocks = extractUnfinishedMissions(SRC, "mission");
    expect(blocks.some((b) => b.lines[0].includes("Not a mission"))).toBe(false);
  });

  it("matches the mission heading as a case-insensitive substring", () => {
    const md = ["## Daily Missions", "- [ ] Stretch"].join("\n");
    expect(extractUnfinishedMissions(md, "mission")).toHaveLength(1);
  });
});

describe("insertMissions", () => {
  const today = ["# Mission", "- [ ] Existing #must", "", "# Quests", "- [ ] Q1"].join("\n");
  const blocks = extractUnfinishedMissions(SRC, "mission");

  it("inserts new mission blocks at the top of the section, right below the heading", () => {
    const res = insertMissions(today, "mission", blocks);
    expect(res.headingMissing).toBe(false);
    expect(res.inserted).toBe(2);
    const lines = res.markdown.split("\n");
    // rolled missions land immediately under the heading, above existing ones
    expect(lines[0]).toBe("# Mission");
    expect(lines[1]).toBe("- [ ] Meditate #must #easy");
    expect(lines.indexOf("- [ ] Meditate #must #easy")).toBeLessThan(lines.indexOf("- [ ] Existing #must"));
    expect(lines).toContain("    - [ ] Main set");
  });

  it("dedups by normalized text (re-running finalize does not stack)", () => {
    const once = insertMissions(today, "mission", blocks).markdown;
    const twice = insertMissions(once, "mission", blocks);
    expect(twice.inserted).toBe(0);
    expect(twice.skipped).toBe(2);
    expect(twice.markdown).toBe(once);
  });

  it("treats an already-present mission as a duplicate regardless of checkbox state", () => {
    const todayDone = ["# Mission", "- [x] Meditate #must #easy"].join("\n");
    const res = insertMissions(todayDone, "mission", [
      { lines: ["- [ ] Meditate #must #easy"], text: "meditate #must #easy" },
    ]);
    expect(res.inserted).toBe(0);
    expect(res.skipped).toBe(1);
  });

  it("reports headingMissing when today has no mission section", () => {
    const noHeading = ["# Quests", "- [ ] Q1"].join("\n");
    const res = insertMissions(noHeading, "mission", blocks);
    expect(res.headingMissing).toBe(true);
    expect(res.inserted).toBe(0);
    expect(res.markdown).toBe(noHeading);
  });
});
