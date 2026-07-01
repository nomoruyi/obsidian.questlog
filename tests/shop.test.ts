import { describe, it, expect } from "vitest";
import { defaultState, balance } from "../src/state/state";
import { buy, redeem, useItem } from "../src/shop/shop";
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
