import { describe, it, expect } from "vitest";
import { parseNote } from "../src/parser/parser";

describe("parseNote", () => {
  it("parses priority, difficulty, category, done and strips tags", () => {
    const md = `### Must Do
- [x] Review previous day #diff/easy #prio/must #mind
- [ ] Shower #diff/medium #prio/must #body`;
    const note = parseNote(md);
    expect(note.tasks).toHaveLength(2);
    expect(note.tasks[0]).toMatchObject({
      text: "Review previous day", done: true, priority: "must", difficulty: "easy", category: "mind", section: "must do",
    });
    expect(note.tasks[1].done).toBe(false);
    expect(note.tasks[1].category).toBe("body");
  });

  it("applies defaults: should priority, medium difficulty, general category", () => {
    const note = parseNote(`- [ ] Untagged task`);
    expect(note.tasks[0]).toMatchObject({ priority: "should", difficulty: "medium", category: "general", optional: false });
  });

  it("marks #opt tasks optional", () => {
    const note = parseNote(`- [ ] Empty bags #opt`);
    expect(note.tasks[0].optional).toBe(true);
  });

  it("rolls a parent up: done only when all children done", () => {
    const md = `- [ ] Laundry #prio/must #home
    - [x] Wash
    - [ ] Hang`;
    const note = parseNote(md);
    expect(note.tasks).toHaveLength(1);
    expect(note.tasks[0].children).toHaveLength(2);
    expect(note.tasks[0].done).toBe(false);

    const md2 = `- [ ] Laundry #prio/must #home
    - [x] Wash
    - [x] Hang`;
    expect(parseNote(md2).tasks[0].done).toBe(true);
  });

  it("tags tasks with the lowercased mission section", () => {
    const md = `### Missions
- [ ] Restaurant reservation #diff/hard #prio/must #social`;
    expect(parseNote(md).tasks[0].section).toBe("missions");
  });

  it("does not treat #headings inside wikilinks as tags", () => {
    const md = `- [ ] Check notes -> add to [[#Missions]] #prio/must #diff/easy #digital`;
    const t = parseNote(md).tasks[0];
    expect(t.category).toBe("digital");
    expect(t.priority).toBe("must");
    expect(t.difficulty).toBe("easy");
    expect(t.text).toContain("[[#Missions]]");
  });
});

describe("parseNote vices", () => {
  it("parses a vice line into label/count/difficulty", () => {
    const note = parseNote(`- Cigarettes: 3 #vice #diff/medium`);
    expect(note.tasks).toHaveLength(0);
    expect(note.vices).toEqual([{ label: "Cigarettes", count: 3, difficulty: "medium" }]);
  });

  it("defaults vice difficulty to medium when #diff is absent", () => {
    const note = parseNote(`- Doomscrolling: 45 #vice`);
    expect(note.vices[0]).toEqual({ label: "Doomscrolling", count: 45, difficulty: "medium" });
  });

  it("ignores non-vice bullets and malformed vice lines", () => {
    const note = parseNote([
      "- just a bullet",
      "- Broken vice #vice #diff/hard",     // no ": N"
      "- Snacks: notanumber #vice",          // non-numeric count
    ].join("\n"));
    expect(note.vices).toEqual([]);
  });

  it("does not treat #vice as a task category and keeps checkbox parsing intact", () => {
    const note = parseNote([
      "- [x] Shower #prio/must #body",
      "- Cigarettes: 2 #vice #diff/hard",
    ].join("\n"));
    expect(note.tasks).toHaveLength(1);
    expect(note.tasks[0].category).toBe("body");
    expect(note.vices).toEqual([{ label: "Cigarettes", count: 2, difficulty: "hard" }]);
  });
});

describe("parseNote allowed-skills restriction", () => {
  const allowed = ["mind", "body", "general"];

  it("accepts a tag as category only when it is in the allowed list", () => {
    const note = parseNote(`- [x] Refactor #cod`, allowed);
    expect(note.tasks[0].category).toBe("general"); // #cod not a configured skill
  });

  it("uses the first allowed-skill tag, skipping unknown ones", () => {
    const note = parseNote(`- [x] Study #cod #mind`, allowed);
    expect(note.tasks[0].category).toBe("mind");
  });

  it("still accepts known skills and strips the unknown tag from text", () => {
    const note = parseNote(`- [x] Lift weights #cod #body`, allowed);
    expect(note.tasks[0].category).toBe("body");
    expect(note.tasks[0].text).toBe("Lift weights");
  });

  it("accepts any first tag as category when no allowed list is passed (back-compat)", () => {
    expect(parseNote(`- [x] Refactor #cod`).tasks[0].category).toBe("cod");
  });
});
