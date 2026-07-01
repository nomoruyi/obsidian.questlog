import { QuestLogConfig } from "../config";

export type ItemEffect =
  | { type: "heal"; amount: number }
  | { type: "maxhp"; amount: number }
  | { type: "regen"; amount: number }
  | { type: "none" };

export interface ShopItem {
  id: string;       // stable key; built-ins fixed; customs slugified from name
  emoji: string;
  name: string;
  price: number;
  desc: string;
  kind: "builtin" | "custom";
  effect: ItemEffect;
}

export function builtinItems(config: QuestLogConfig): ShopItem[] {
  return [
    { id: "potion_minor", emoji: "🧪", name: "Minor Potion", price: config.potionPrices.minor, desc: "Restore 20 HP.", kind: "builtin", effect: { type: "heal", amount: 20 } },
    { id: "potion", emoji: "🧪", name: "Potion", price: config.potionPrices.normal, desc: "Restore 50 HP.", kind: "builtin", effect: { type: "heal", amount: 50 } },
    { id: "potion_major", emoji: "🧪", name: "Major Potion", price: config.potionPrices.major, desc: "Restore 100 HP.", kind: "builtin", effect: { type: "heal", amount: 100 } },
    { id: "maxhp", emoji: "❤️", name: `Max HP +${config.maxHpUpgradeAmount}`, price: config.maxHpUpgradePrice, desc: "Permanently raise max HP.", kind: "builtin", effect: { type: "maxhp", amount: config.maxHpUpgradeAmount } },
    { id: "regen", emoji: "♻️", name: `Regen +${config.regenUpgradeAmount}`, price: config.regenUpgradePrice, desc: "Permanently raise daily regen.", kind: "builtin", effect: { type: "regen", amount: config.regenUpgradeAmount } },
    { id: "freeze", emoji: "🧊", name: "Streak Freeze", price: config.freezePrice, desc: "Insurance: auto-covers a missed day at finalize.", kind: "builtin", effect: { type: "none" } },
  ];
}

const FALLBACK_EMOJI = "🎁";

export const REWARDS_TEMPLATE = [
  "| Emoji | Name | Price | Description |",
  "| --- | --- | --- | --- |",
  "| 🍫 | Chocolate bar | 25 | One square, guilt-free |",
  "",
].join("\n");

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Lenient pipe parser: "emoji | name | price | desc" per line.
// Blank lines, header/separator rows, and lines without a name or numeric price are skipped.
export function parseRewards(md: string): ShopItem[] {
  const items: ShopItem[] = [];
  for (const line of md.split(/\r?\n/)) {
    const raw = line.trim();
    if (!raw || !raw.includes("|")) continue;
    let cols = raw.split("|").map((c) => c.trim());
    // Markdown tables wrap rows in pipes; drop exactly the empty bounding cells
    // so a genuinely empty emoji cell isn't collapsed away.
    if (raw.startsWith("|")) cols = cols.slice(1);
    if (raw.endsWith("|")) cols = cols.slice(0, -1);
    const emoji = cols[0] || FALLBACK_EMOJI;
    const name = cols[1] ?? "";
    const price = parseInt(cols[2] ?? "", 10);
    const desc = cols[3] ?? "";
    if (!name || Number.isNaN(price)) continue;
    const id = slugify(name);
    if (!id) continue;
    const item: ShopItem = { id, emoji, name, price, desc, kind: "custom", effect: { type: "none" } };
    const at = items.findIndex((it) => it.id === id);
    if (at >= 0) items[at] = item; // last wins
    else items.push(item);
  }
  return items;
}
