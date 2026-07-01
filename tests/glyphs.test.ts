import { describe, it, expect } from "vitest";
import { resolveGlyph, glyphSpans } from "../src/render/glyphs";

const SKILLS = { mind: "🧠", body: "💪", home: "🏠" };

describe("resolveGlyph", () => {
  it("maps priority tags to exclamation marks", () => {
    expect(resolveGlyph("prio/must", SKILLS)).toBe("‼️");
    expect(resolveGlyph("prio/should", SKILLS)).toBe("❗");
    expect(resolveGlyph("prio/could", SKILLS)).toBe("❕");
  });
  it("maps difficulty tags to traffic lights", () => {
    expect(resolveGlyph("diff/easy", SKILLS)).toBe("🟢");
    expect(resolveGlyph("diff/medium", SKILLS)).toBe("🟡");
    expect(resolveGlyph("diff/hard", SKILLS)).toBe("🔴");
  });
  it("maps #opt to ➕", () => {
    expect(resolveGlyph("opt", SKILLS)).toBe("➕");
  });
  it("maps #vice to ☠️", () => {
    expect(resolveGlyph("vice", SKILLS)).toBe("☠️");
  });
  it("maps a configured skill to its glyph", () => {
    expect(resolveGlyph("body", SKILLS)).toBe("💪");
  });
  it("returns null for unknown tags", () => {
    expect(resolveGlyph("quest", SKILLS)).toBeNull();
    expect(resolveGlyph("prio/bogus", SKILLS)).toBeNull();
  });
});

describe("glyphSpans", () => {
  it("returns [] for non-bullet lines", () => {
    expect(glyphSpans("#Daily #Quest", SKILLS)).toEqual([]);
    expect(glyphSpans("## Heading #body", SKILLS)).toEqual([]);
  });
  it("decorates a bare-bullet vice line (#vice + #diff)", () => {
    const line = "- Cigarettes: 3 #vice #diff/easy";
    const spans = glyphSpans(line, SKILLS);
    expect(spans).toEqual([
      { from: 16, to: 21, glyph: "☠️" },
      { from: 22, to: 32, glyph: "🟢" },
    ]);
    expect(line.slice(16, 21)).toBe("#vice");
    expect(line.slice(22, 32)).toBe("#diff/easy");
  });
  it("returns one span per known tag with correct offsets", () => {
    const line = "- [ ] Shower #prio/must #diff/easy #body";
    const spans = glyphSpans(line, SKILLS);
    expect(spans).toEqual([
      { from: 13, to: 23, glyph: "‼️" },
      { from: 24, to: 34, glyph: "🟢" },
      { from: 35, to: 40, glyph: "💪" },
    ]);
    expect(line.slice(13, 23)).toBe("#prio/must");
    expect(line.slice(24, 34)).toBe("#diff/easy");
    expect(line.slice(35, 40)).toBe("#body");
  });
  it("skips unknown tags but keeps known ones", () => {
    const line = "- [ ] Task #prio/must #weird #mind";
    expect(glyphSpans(line, SKILLS).map((s) => s.glyph)).toEqual(["‼️", "🧠"]);
  });
  it("handles a checked box and an #opt tag", () => {
    const line = "- [x] Bags #prio/should #opt";
    expect(glyphSpans(line, SKILLS).map((s) => s.glyph)).toEqual(["❗", "➕"]);
  });
});
