import { describe, it, expect } from "vitest";
import { defaultState, balance } from "../src/state/state";
import { buy, redeem, useItem, itemPrice } from "../src/shop/shop";
import { ShopItem } from "../src/shop/rewards";
import { DEFAULT_CONFIG } from "../src/config";

const item: ShopItem = { id: "potion", emoji: "🧪", name: "Potion", price: 30, desc: "", kind: "builtin", effect: { type: "heal", amount: 50 } };

describe("buy", () => {
  it("rejects when balance is below price and leaves state untouched", () => {
    const s = { ...defaultState(), coinsEarned: 20 };
    const r = buy(s, item);
    expect(r).toEqual({ ok: false, reason: "insufficient" });
    expect(s.coinsSpent).toBe(0);
    expect(s.inventory).toEqual({});
  });

  it("on success increments coinsSpent and inventory count", () => {
    const s = { ...defaultState(), coinsEarned: 100 };
    expect(buy(s, item)).toEqual({ ok: true });
    expect(s.coinsSpent).toBe(30);
    expect(s.inventory).toEqual({ potion: 1 });
    expect(balance(s)).toBe(70);
    buy(s, item);
    expect(s.inventory).toEqual({ potion: 2 });
  });
});

describe("redeem", () => {
  it("no-ops on a missing or zero item", () => {
    const s = defaultState();
    expect(redeem(s, "potion")).toEqual({ ok: false, reason: "none" });
  });

  it("decrements count and deletes the key at zero", () => {
    const s = { ...defaultState(), inventory: { potion: 2 } };
    expect(redeem(s, "potion")).toEqual({ ok: true });
    expect(s.inventory).toEqual({ potion: 1 });
    expect(redeem(s, "potion")).toEqual({ ok: true });
    expect(s.inventory).toEqual({});
  });
});

describe("useItem", () => {
  const cfg = DEFAULT_CONFIG;

  it("heals up to maxHP and consumes the item", () => {
    const s = { ...defaultState(), hp: 70, maxHP: 100, inventory: { potion: 1 } };
    expect(useItem(s, "potion", cfg)).toEqual({ ok: true });   // +50 -> capped at 100
    expect(s.hp).toBe(100);
    expect(s.inventory.potion).toBeUndefined();
  });

  it("raises maxHP and grants the new headroom", () => {
    const s = { ...defaultState(), hp: 100, maxHP: 100, inventory: { maxhp: 1 } };
    expect(useItem(s, "maxhp", cfg)).toEqual({ ok: true });
    expect(s.maxHP).toBe(110);
    expect(s.hp).toBe(110);
  });

  it("raises daily regen", () => {
    const s = { ...defaultState(), dailyRegen: 10, inventory: { regen: 1 } };
    expect(useItem(s, "regen", cfg)).toEqual({ ok: true });
    expect(s.dailyRegen).toBe(12);
  });

  it("refuses to use a freeze token and never consumes it", () => {
    const s = { ...defaultState(), inventory: { freeze: 2 } };
    expect(useItem(s, "freeze", cfg)).toEqual({ ok: false, reason: "not-usable" });
    expect(s.inventory.freeze).toBe(2);
  });

  it("reports none when the item is not owned", () => {
    const s = defaultState();
    expect(useItem(s, "potion", cfg)).toEqual({ ok: false, reason: "none" });
  });
});

const permItem: ShopItem = { id: "maxhp", emoji: "❤️", name: "Max HP +10", price: 300, desc: "", kind: "builtin", effect: { type: "maxhp", amount: 10 }, permanent: true, step: 5 };

describe("itemPrice", () => {
  it("ignores the purchase count for a non-permanent item", () => {
    const s = { ...defaultState(), purchases: { potion: 4 } };
    expect(itemPrice(item, s)).toBe(30);
  });

  it("adds one step per prior purchase of a permanent item", () => {
    expect(itemPrice(permItem, defaultState())).toBe(300);
    expect(itemPrice(permItem, { ...defaultState(), purchases: { maxhp: 3 } })).toBe(315);
  });
});

describe("buying a permanent upgrade", () => {
  it("charges the escalated price and counts the purchase", () => {
    const s = { ...defaultState(), coinsEarned: 1000 };
    expect(buy(s, permItem)).toEqual({ ok: true });
    expect(buy(s, permItem)).toEqual({ ok: true });
    expect(s.purchases).toEqual({ maxhp: 2 });
    expect(s.coinsSpent).toBe(605);   // 300 + 305
  });

  it("rejects when the balance covers the base price but not the escalated one", () => {
    const s = { ...defaultState(), coinsEarned: 302, purchases: { maxhp: 1 } };
    expect(buy(s, permItem)).toEqual({ ok: false, reason: "insufficient" });
    expect(s.purchases).toEqual({ maxhp: 1 });
    expect(s.coinsSpent).toBe(0);
  });

  it("does not count purchases of ordinary items", () => {
    const s = { ...defaultState(), coinsEarned: 100 };
    buy(s, item);
    expect(s.purchases).toEqual({});
  });
});
