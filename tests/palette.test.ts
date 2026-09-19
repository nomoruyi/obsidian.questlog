import { describe, it, expect } from "vitest";
import { needsTags, sweepTargets, currentTags, questText, uniquePrefixes } from "../src/tags/palette";

const SKILLS = ["mind", "body", "home", "social", "digital", "general"];
const split = (s: string) => s.split("\n");

describe("needsTags", () => {
  it("is true for a bare mission", () => {
    expect(needsTags("- [ ] Optimize Minerva", SKILLS)).toBe(true);
  });
  it("is true when only priority is present", () => {
    expect(needsTags("- [ ] Linox vet bill  #prio/must", SKILLS)).toBe(true);
  });
  it("is true when only the category is missing", () => {
    expect(needsTags("- [ ] Task  #prio/must  #diff/easy", SKILLS)).toBe(true);
  });
  it("is false when all three are present", () => {
    expect(needsTags("- [ ] Task  #prio/must  #diff/easy  #home", SKILLS)).toBe(false);
  });
  it("is true for a checked line that is still untagged", () => {
    expect(needsTags("- [x] Submit vet bill", SKILLS)).toBe(true);
  });
  it("does not count a tag outside config.skills as a category", () => {
    expect(needsTags("- [ ] Task  #prio/must  #diff/easy  #finance", SKILLS)).toBe(true);
  });
  it("is false for the empty template placeholder", () => {
    expect(needsTags("- [ ] ", SKILLS)).toBe(false);
  });
  it("is false for a line that is only tags", () => {
    expect(needsTags("- [ ] #prio/must", SKILLS)).toBe(false);
  });
  it("is false for an indented subtask", () => {
    expect(needsTags("\t- [ ] Morning", SKILLS)).toBe(false);
    expect(needsTags("  - [ ] Morning", SKILLS)).toBe(false);
  });
  it("is false for a non-checkbox bullet", () => {
    expect(needsTags("- Cigarettes: 1  #diff/hard  #vice", SKILLS)).toBe(false);
  });
  it("does not treat a heading wikilink as a tag", () => {
    expect(needsTags("- [ ] See [[#Missions]]  #prio/must  #diff/easy  #home", SKILLS)).toBe(false);
  });
});

describe("sweepTargets", () => {
  const NOTE = split([
    "#Daily #Quest",
    "# Keep on keeping on!",
    "",
    "## Missions:",
    "- [ ] Optimize Minerva",
    "- [ ] Linox vet bill  #prio/must",
    "- [ ] Buy Tickets  #prio/should  #diff/easy  #social",
    "\t- [ ] subtask",
    "- [ ] ",
    "",
    "---",
    "",
    "- Cigarettes: 1  #diff/hard  #vice",
    "",
    "## Daily Tasks:",
    "- [ ] Check emails",
  ].join("\n"));

  it("returns bare and partial missions in document order", () => {
    expect(sweepTargets(NOTE, "mission", SKILLS)).toEqual([4, 5]);
  });
  it("returns an empty list when every mission is tagged", () => {
    const lines = split("## Missions:\n- [ ] A  #prio/must  #diff/easy  #home");
    expect(sweepTargets(lines, "mission", SKILLS)).toEqual([]);
  });
  it("returns an empty list when there is no missions section", () => {
    expect(sweepTargets(split("# T\n- [ ] A"), "mission", SKILLS)).toEqual([]);
  });
  it("never reaches lines below the --- boundary", () => {
    const lines = split("## Missions:\n---\n- [ ] Below the rule");
    expect(sweepTargets(lines, "mission", SKILLS)).toEqual([]);
  });
  it("ignores tags on the heading line itself", () => {
    const lines = split("## Missions:  #prio/must  #diff/easy  #home\n- [ ] Bare");
    expect(sweepTargets(lines, "mission", SKILLS)).toEqual([1]);
  });
});

describe("currentTags", () => {
  it("reads all three tags off a line", () => {
    expect(currentTags("- [ ] Task  #prio/must  #diff/hard  #home", SKILLS))
      .toEqual({ prio: "must", diff: "hard", cat: "home" });
  });
  it("falls back to the parser defaults on a bare line", () => {
    expect(currentTags("- [ ] Task", SKILLS))
      .toEqual({ prio: "should", diff: "medium", cat: "general" });
  });
  it("fills only the gaps on a partial line", () => {
    expect(currentTags("- [ ] Task  #prio/must", SKILLS))
      .toEqual({ prio: "must", diff: "medium", cat: "general" });
  });
  it("ignores an unknown value in a known prefix", () => {
    expect(currentTags("- [ ] Task  #prio/urgent", SKILLS).prio).toBe("should");
  });
  it("ignores a tag outside config.skills", () => {
    expect(currentTags("- [ ] Task  #finance", SKILLS).cat).toBe("general");
  });
  it("falls back to the first skill when general is not configured", () => {
    expect(currentTags("- [ ] Task", ["mind", "body"]).cat).toBe("mind");
  });
  it("keeps the first category when a line carries two", () => {
    expect(currentTags("- [ ] Task  #home  #body", SKILLS).cat).toBe("home");
  });
});

describe("questText", () => {
  it("strips the checkbox and every tag", () => {
    expect(questText("- [ ] Bong reinigen  #prio/could  #diff/medium  #home"))
      .toBe("Bong reinigen");
  });
  it("keeps a wikilink intact", () => {
    expect(questText("- [x] Read [[2_PERSONAL/NOSA/Car|Car]] milage  #prio/could"))
      .toBe("Read [[2_PERSONAL/NOSA/Car|Car]] milage");
  });
  it("returns an empty string for the placeholder", () => {
    expect(questText("- [ ] ")).toBe("");
  });
});

describe("uniquePrefixes", () => {
  it("gives one letter each when first letters are distinct", () => {
    expect(uniquePrefixes(["mind", "body", "home", "social", "digital", "general"]))
      .toEqual(["m", "b", "h", "s", "d", "g"]);
  });
  it("lengthens only the names that collide", () => {
    expect(uniquePrefixes(["mind", "music", "body", "home"]))
      .toEqual(["mi", "mu", "b", "h"]);
  });
  it("gives a name that is a strict prefix of another its full spelling", () => {
    expect(uniquePrefixes(["home", "homework"])).toEqual(["home", "homew"]);
  });
  it("handles a three-way collision", () => {
    expect(uniquePrefixes(["mind", "mining", "mint"])).toEqual(["mind", "mini", "mint"]);
  });
  it("handles a single name", () => {
    expect(uniquePrefixes(["general"])).toEqual(["g"]);
  });
  it("handles an empty list", () => {
    expect(uniquePrefixes([])).toEqual([]);
  });
});
