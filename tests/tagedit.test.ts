import { describe, it, expect } from "vitest";
import { setPrefixedTag, setCategory, toggleOptional, hasOptional, toggleVice, hasVice, normalizeTagOrder } from "../src/tags/edit";

describe("setPrefixedTag", () => {
  it("replaces an existing #diff/* tag and appends with two-space separation", () => {
    expect(setPrefixedTag("- [ ] Shower #prio/must #diff/easy #body", "diff", "hard"))
      .toBe("- [ ] Shower #prio/must #body  #diff/hard");
  });
  it("appends #diff when absent", () => {
    expect(setPrefixedTag("- [ ] Shower #prio/must #body", "diff", "medium"))
      .toBe("- [ ] Shower #prio/must #body  #diff/medium");
  });
  it("replaces an existing #prio/* tag", () => {
    expect(setPrefixedTag("- [x] Task #prio/should #body", "prio", "must"))
      .toBe("- [x] Task #body  #prio/must");
  });
  it("preserves two-space separation when replacing a middle tag", () => {
    expect(setPrefixedTag("- [ ] X  #prio/must  #diff/easy  #body", "diff", "hard"))
      .toBe("- [ ] X  #prio/must  #body  #diff/hard");
  });
});

describe("setCategory", () => {
  it("replaces an existing category", () => {
    expect(setCategory("- [ ] Task #prio/must #diff/easy #digital", "mind"))
      .toBe("- [ ] Task #prio/must #diff/easy  #mind");
  });
  it("appends a category when none present", () => {
    expect(setCategory("- [ ] Task #prio/must #diff/easy", "home"))
      .toBe("- [ ] Task #prio/must #diff/easy  #home");
  });
  it("leaves a [[#heading]] wikilink untouched", () => {
    expect(setCategory("- [ ] Add to [[#Missions]] #prio/must #digital", "mind"))
      .toBe("- [ ] Add to [[#Missions]] #prio/must  #mind");
  });
  it("removes a category even if it is not a configured skill", () => {
    expect(setCategory("- [ ] Task #prio/must #weirdcat", "body"))
      .toBe("- [ ] Task #prio/must  #body");
  });
});

describe("toggleOptional / hasOptional", () => {
  it("adds #opt when absent", () => {
    expect(toggleOptional("- [ ] Bags #prio/should #home"))
      .toBe("- [ ] Bags #prio/should #home  #opt");
  });
  it("removes #opt when present", () => {
    expect(toggleOptional("- [ ] Bags #prio/should #home #opt"))
      .toBe("- [ ] Bags #prio/should #home");
  });
  it("detects #opt", () => {
    expect(hasOptional("- [ ] Bags #opt")).toBe(true);
    expect(hasOptional("- [ ] Bags #prio/must")).toBe(false);
  });
});

describe("toggleVice / hasVice", () => {
  it("adds #vice when absent", () => {
    expect(toggleVice("- Cigarettes: 3 #diff/easy"))
      .toBe("- Cigarettes: 3 #diff/easy  #vice");
  });
  it("removes #vice when present", () => {
    expect(toggleVice("- Cigarettes: 3 #diff/easy #vice"))
      .toBe("- Cigarettes: 3 #diff/easy");
  });
  it("detects #vice", () => {
    expect(hasVice("- Cigarettes: 3 #vice")).toBe(true);
    expect(hasVice("- Cigarettes: 3 #diff/easy")).toBe(false);
  });
});

describe("normalizeTagOrder", () => {
  const SKILLS = ["mind", "body", "home", "social", "digital", "general"];

  it("reorders to prio → diff → cat", () => {
    expect(normalizeTagOrder("- [ ] Shower #body #diff/easy #prio/must", SKILLS))
      .toBe("- [ ] Shower  #prio/must  #diff/easy  #body");
  });
  it("places opt after the category", () => {
    expect(normalizeTagOrder("- [ ] Bags #opt #home #prio/should", SKILLS))
      .toBe("- [ ] Bags  #prio/should  #home  #opt");
  });
  it("orders a bare-bullet vice line (diff before vice)", () => {
    expect(normalizeTagOrder("- Cigarettes: 3 #vice #diff/easy", SKILLS))
      .toBe("- Cigarettes: 3  #diff/easy  #vice");
  });
  it("appends unknown tags after the recognized ones", () => {
    expect(normalizeTagOrder("- [ ] X #weird #prio/must #body", SKILLS))
      .toBe("- [ ] X  #prio/must  #body  #weird");
  });
  it("is idempotent on an already-canonical line", () => {
    const line = "- [ ] X  #prio/must  #diff/easy  #body";
    expect(normalizeTagOrder(line, SKILLS)).toBe(line);
  });
  it("leaves a [[#heading]] wikilink untouched", () => {
    expect(normalizeTagOrder("- [ ] Add to [[#Missions]] #body #prio/must", SKILLS))
      .toBe("- [ ] Add to [[#Missions]]  #prio/must  #body");
  });
  it("returns the line unchanged when it has no tags", () => {
    expect(normalizeTagOrder("- [ ] Plain task", SKILLS)).toBe("- [ ] Plain task");
  });
});
