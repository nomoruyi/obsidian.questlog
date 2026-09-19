import { describe, it, expect } from "vitest";
import { missionSectionRange } from "../src/engine/missions";

const split = (s: string) => s.split("\n");

describe("missionSectionRange", () => {
  it("returns null when no heading matches", () => {
    expect(missionSectionRange(split("# Title\n- [ ] a"), "mission")).toBeNull();
  });

  it("returns null for an empty missionHeading", () => {
    expect(missionSectionRange(split("### Missions:\n- [ ] a"), "")).toBeNull();
  });

  it("starts on the line after the heading and ends at a same-level heading", () => {
    const lines = split("# T\n### Missions:\n- [ ] a\n- [ ] b\n### Daily Tasks:\n- [ ] c");
    expect(missionSectionRange(lines, "mission")).toEqual({ start: 2, end: 4 });
  });

  it("ends at a deeper heading too", () => {
    const lines = split("### Missions:\n- [ ] a\n###### Later\n- [ ] b");
    expect(missionSectionRange(lines, "mission")).toEqual({ start: 1, end: 2 });
  });

  it("ends at a --- rule", () => {
    const lines = split("### Missions:\n- [ ] a\n\n---\n\n- Cigarettes: 1  #vice\n\n### Daily Tasks:");
    expect(missionSectionRange(lines, "mission")).toEqual({ start: 1, end: 3 });
  });

  it("takes whichever boundary comes first — heading before rule", () => {
    const lines = split("### Missions:\n- [ ] a\n### Next\n---");
    expect(missionSectionRange(lines, "mission")).toEqual({ start: 1, end: 2 });
  });

  it("runs to end of file when nothing closes the section", () => {
    const lines = split("### Missions:\n- [ ] a\n- [ ] b");
    expect(missionSectionRange(lines, "mission")).toEqual({ start: 1, end: 3 });
  });

  it("matches the heading case-insensitively as a substring", () => {
    const lines = split("## My MISSIONS for today\n- [ ] a");
    expect(missionSectionRange(lines, "mission")).toEqual({ start: 1, end: 2 });
  });

  it("uses the first matching heading only", () => {
    const lines = split("### Missions:\n- [ ] a\n### More missions\n- [ ] b");
    expect(missionSectionRange(lines, "mission")).toEqual({ start: 1, end: 2 });
  });

  // Pinned to the real daily template. The heading level has already moved from
  // H3 to H2 once; the boundary rule must not care.
  it("bounds the section in the live daily template, whatever the heading level", () => {
    const template = [
      "#Daily #Quest",              // 0
      "# Keep on keeping on!",      // 1
      "",                           // 2
      "## Missions:",               // 3
      "- [ ] ",                     // 4
      "",                           // 5
      "---",                        // 6
      "",                           // 7
      "- Cigarettes: 0  #diff/hard  #vice", // 8
      "- Js: 0  #diff/easy  #vice",         // 9
      "",                           // 10
      "## Daily Tasks:",            // 11
      "#### MUST DO",               // 12
      "**Digital**",                // 13
      "- [ ] Check emails  #prio/must  #diff/medium  #digital", // 14
    ];
    expect(missionSectionRange(template, "mission")).toEqual({ start: 4, end: 6 });

    // The same note with the old H3 headings must give the same answer.
    const old = template.map((l) => (l.startsWith("## ") ? `#${l}` : l));
    expect(missionSectionRange(old, "mission")).toEqual({ start: 4, end: 6 });
  });
});
