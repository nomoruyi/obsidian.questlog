import { GameState, balance } from "../state/state";
import { ShopItem, builtinItems } from "./rewards";
import { QuestLogConfig } from "../config";

export interface BuyResult { ok: boolean; reason?: "insufficient"; }
export interface RedeemResult { ok: boolean; reason?: "none"; }

// Permanent upgrades get dearer the more you own: base + step per prior buy.
export function itemPrice(item: ShopItem, state: GameState): number {
  if (!item.permanent) return item.price;
  return item.price + (item.step ?? 0) * (state.purchases[item.id] ?? 0);
}

export function buy(state: GameState, item: ShopItem): BuyResult {
  const price = itemPrice(item, state);
  if (balance(state) < price) return { ok: false, reason: "insufficient" };
  state.coinsSpent += price;
  state.inventory[item.id] = (state.inventory[item.id] ?? 0) + 1;
  if (item.permanent) state.purchases[item.id] = (state.purchases[item.id] ?? 0) + 1;
  return { ok: true };
}

export function redeem(state: GameState, id: string): RedeemResult {
  const have = state.inventory[id] ?? 0;
  if (have <= 0) return { ok: false, reason: "none" };
  if (have - 1 <= 0) delete state.inventory[id];
  else state.inventory[id] = have - 1;
  return { ok: true };
}

export interface UseResult { ok: boolean; reason?: "none" | "not-usable"; }

export function useItem(state: GameState, id: string, config: QuestLogConfig): UseResult {
  const item = builtinItems(config).find((i) => i.id === id);
  if (!item || item.effect.type === "none") return { ok: false, reason: "not-usable" };
  if ((state.inventory[id] ?? 0) <= 0) return { ok: false, reason: "none" };

  const e = item.effect;
  if (e.type === "heal") state.hp = Math.min(state.maxHP, state.hp + e.amount);
  else if (e.type === "maxhp") { state.maxHP += e.amount; state.hp += e.amount; }
  else if (e.type === "regen") state.dailyRegen += e.amount;

  const have = state.inventory[id] ?? 0;
  if (have - 1 <= 0) delete state.inventory[id];
  else state.inventory[id] = have - 1;
  return { ok: true };
}
