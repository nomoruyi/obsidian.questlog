import { describe, it, expect } from "vitest";
import { classifyPeriodic } from "../src/vault/periodic";

const folders = { daily: "1_ORGA/1_DAILYS", weekly: "1_ORGA/2_WEEKLYS", monthly: "1_ORGA/3_MONTHLYS" };

describe("classifyPeriodic", () => {
  it("identifies a daily note by folder", () => {
    expect(classifyPeriodic("1_ORGA/1_DAILYS/Thu, 25. Jun 2026.md", folders)).toBe("daily");
  });
  it("identifies weekly and monthly notes", () => {
    expect(classifyPeriodic("1_ORGA/2_WEEKLYS/W25 - 2026.md", folders)).toBe("weekly");
    expect(classifyPeriodic("1_ORGA/3_MONTHLYS/June - 2026.md", folders)).toBe("monthly");
  });
  it("returns null for non-periodic notes", () => {
    expect(classifyPeriodic("2_PERSONAL/Notes.md", folders)).toBeNull();
  });
});
