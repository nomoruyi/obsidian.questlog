import { describe, it, expect } from "vitest";
import { parseRewards, builtinItems, REWARDS_TEMPLATE } from "../src/shop/rewards";
import { DEFAULT_CONFIG } from "../src/config";

describe("builtinItems", () => {
  it("lists the six built-ins with config-driven prices and effects", () => {
    const items = builtinItems(DEFAULT_CONFIG);
    expect(items.map((i) => i.id)).toEqual(["potion_minor", "potion", "potion_major", "maxhp", "regen", "freeze"]);
    expect(items.find((i) => i.id === "potion")!.effect).toEqual({ type: "heal", amount: 50 });
    expect(items.find((i) => i.id === "maxhp")!.effect).toEqual({ type: "maxhp", amount: 10 });
    expect(items.find((i) => i.id === "regen")!.effect).toEqual({ type: "regen", amount: 2 });
    expect(items.find((i) => i.id === "freeze")!.effect).toEqual({ type: "none" });
    expect(items.every((i) => i.kind === "builtin")).toBe(true);
  });
});

describe("parseRewards", () => {
  it("parses well-formed pipe lines with slugified ids", () => {
    const md = `🍫 | Chocolate bar | 25 | One square, guilt-free`;
    expect(parseRewards(md)).toEqual([
      { id: "chocolate-bar", emoji: "🍫", name: "Chocolate bar", price: 25, desc: "One square, guilt-free", kind: "custom", effect: { type: "none" } },
    ]);
  });

  it("skips blank lines, header rows, separators, and non-numeric prices", () => {
    const md = [
      "emoji | name | price | desc",
      "--- | --- | --- | ---",
      "",
      "🎮 | Gaming | 60 | Timer on",
      "🚫 | Broken | notanumber | nope",
    ].join("\n");
    expect(parseRewards(md).map((i) => i.id)).toEqual(["gaming"]);
  });

  it("falls back to 🎁 for a missing emoji and '' for a missing desc", () => {
    const md = `| | Plain reward | 15 | |`;
    const item = parseRewards(md)[0];
    expect(item.emoji).toBe("🎁");
    expect(item.desc).toBe("");
    expect(item.name).toBe("Plain reward");
  });

  it("last occurrence wins on duplicate ids", () => {
    const md = `🍫 | Treat | 10 | a\n🍪 | Treat | 20 | b`;
    const items = parseRewards(md);
    expect(items).toHaveLength(1);
    expect(items[0].price).toBe(20);
  });

  it("parses a full Obsidian table, skipping header and separator rows", () => {
    const md = [
      "| Emoji | Name | Price | Description |",
      "| --- | --- | --- | --- |",
      "| 🍫 | Chocolate bar | 25 | One square |",
      "| 🎮 | Gaming | 60 | Timer on |",
    ].join("\n");
    const items = parseRewards(md);
    expect(items.map((i) => i.id)).toEqual(["chocolate-bar", "gaming"]);
    expect(items[0]).toMatchObject({ emoji: "🍫", name: "Chocolate bar", price: 25, desc: "One square" });
  });

});

describe("REWARDS_TEMPLATE", () => {
  it("is a parseable starter table with one example reward", () => {
    const items = parseRewards(REWARDS_TEMPLATE);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Chocolate bar");
  });
});
