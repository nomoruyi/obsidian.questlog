import { describe, it, expect } from "vitest";
import { parseSkillsField, formatSkillsField } from "../src/config";

describe("parseSkillsField", () => {
  it("parses name=emoji pairs", () => {
    expect(parseSkillsField("mind=🧠, body=💪")).toEqual({
      skills: ["mind", "body"],
      glyphs: { mind: "🧠", body: "💪" },
    });
  });
  it("uses the fallback glyph for a token without '='", () => {
    expect(parseSkillsField("mind=🧠, plain")).toEqual({
      skills: ["mind", "plain"],
      glyphs: { mind: "🧠", plain: "🏷️" },
    });
  });
  it("lowercases names and tolerates whitespace", () => {
    expect(parseSkillsField("  Body = 💪 ,  ")).toEqual({
      skills: ["body"],
      glyphs: { body: "💪" },
    });
  });
  it("drops a pair with an empty name", () => {
    expect(parseSkillsField("=💪, mind=🧠")).toEqual({
      skills: ["mind"],
      glyphs: { mind: "🧠" },
    });
  });
  it("de-dupes by name, last glyph wins", () => {
    expect(parseSkillsField("mind=🧠, mind=🧪")).toEqual({
      skills: ["mind"],
      glyphs: { mind: "🧪" },
    });
  });
});

describe("formatSkillsField", () => {
  it("re-emits name=emoji in skills order", () => {
    expect(formatSkillsField(["mind", "body"], { mind: "🧠", body: "💪" })).toBe("mind=🧠, body=💪");
  });
  it("falls back to 🏷️ for a name missing from the glyph map", () => {
    expect(formatSkillsField(["mind", "x"], { mind: "🧠" })).toBe("mind=🧠, x=🏷️");
  });
  it("round-trips with parseSkillsField", () => {
    const { skills, glyphs } = parseSkillsField("mind=🧠, body=💪, home=🏠");
    expect(parseSkillsField(formatSkillsField(skills, glyphs))).toEqual({ skills, glyphs });
  });
});
