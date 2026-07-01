import { describe, it, expect } from "vitest";
import { noteHasMarker } from "../src/parser/marker";

describe("noteHasMarker", () => {
  it("detects the marker tag on its own line", () => {
    expect(noteHasMarker("#Quest\n# Daily\n- [ ] task", "Quest")).toBe(true);
  });
  it("detects the marker mid-line after whitespace", () => {
    expect(noteHasMarker("tags: #Daily #Quest done", "Quest")).toBe(true);
  });
  it("is case-insensitive", () => {
    expect(noteHasMarker("#quest", "Quest")).toBe(true);
    expect(noteHasMarker("#QUEST", "quest")).toBe(true);
  });
  it("returns false when the marker is absent", () => {
    expect(noteHasMarker("#Daily\n- [ ] task", "Quest")).toBe(false);
  });
  it("does not match a longer tag that has the marker as a prefix", () => {
    expect(noteHasMarker("#Questing", "Quest")).toBe(false);
    expect(noteHasMarker("#Quest/sub", "Quest")).toBe(false);
  });
  it("does not match when not preceded by a boundary", () => {
    expect(noteHasMarker("foo#Quest", "Quest")).toBe(false);
  });
  it("ignores a leading '#' in the configured marker", () => {
    expect(noteHasMarker("#Quest", "#Quest")).toBe(true);
  });
  it("counts every note when the marker is empty", () => {
    expect(noteHasMarker("no tags here", "")).toBe(true);
    expect(noteHasMarker("no tags here", "   ")).toBe(true);
  });
});
