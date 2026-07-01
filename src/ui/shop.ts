import { App, Modal, Notice, TFile } from "obsidian";
import QuestLogPlugin from "../../main";
import { ShopItem, builtinItems, parseRewards, REWARDS_TEMPLATE } from "../shop/rewards";
import { buy, redeem } from "../shop/shop";
import { balance } from "../state/state";

export class ShopModal extends Modal {
  constructor(app: App, private plugin: QuestLogPlugin) { super(app); }

  async onOpen() { await this.render(); }
  onClose() { this.contentEl.empty(); }

  // Create _questlog/ + the rewards note from a starter table when absent, so
  // the shop never dead-ends on a missing file. Failures fall through to the
  // existing "(no … found)" message.
  private async ensureRewardsNote(): Promise<void> {
    const path = this.plugin.data.config.rewardsNotePath;
    if (this.app.vault.getAbstractFileByPath(path) instanceof TFile) return;
    const slash = path.lastIndexOf("/");
    const folder = slash >= 0 ? path.slice(0, slash) : "";
    try {
      if (folder && !this.app.vault.getAbstractFileByPath(folder)) {
        await this.app.vault.createFolder(folder);
      }
      await this.app.vault.create(path, REWARDS_TEMPLATE);
    } catch {
      /* leave missing; render() shows the fallback message */
    }
  }

  // null = rewards note missing/unreadable; [] = note exists but defines nothing.
  private async loadCustomItems(): Promise<ShopItem[] | null> {
    const path = this.plugin.data.config.rewardsNotePath;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return null;
    try {
      return parseRewards(await this.app.vault.read(file));
    } catch {
      return null;
    }
  }

  private async render() {
    await this.ensureRewardsNote();
    const customs = await this.loadCustomItems();
    const { contentEl } = this;
    const cfg = this.plugin.data.config;
    contentEl.empty();
    contentEl.addClass("questlog-shop");

    const head = contentEl.createEl("h2", { cls: "questlog-shop-title" });
    head.createSpan({ text: "Shop" });
    head.createSpan({ text: `🪙 ${balance(this.plugin.data.state)}`, cls: "questlog-shop-balance" });

    contentEl.createEl("h3", { text: "Built-ins" });
    for (const item of builtinItems(cfg)) this.itemRow(contentEl, item, false);

    contentEl.createEl("h3", { text: "Rewards" });
    if (customs === null) {
      contentEl.createEl("p", { text: `(no ${cfg.rewardsNotePath} found)` });
    } else if (customs.length === 0) {
      contentEl.createEl("p", { text: "(no rewards defined)" });
    } else {
      for (const item of customs) this.itemRow(contentEl, item, true);
    }
  }

  private itemRow(parent: HTMLElement, item: ShopItem, canRedeem: boolean) {
    const owned = this.plugin.data.state.inventory[item.id] ?? 0;
    const row = parent.createDiv({ cls: "questlog-shop-item" });

    const info = row.createDiv({ cls: "questlog-shop-item-info" });
    info.createSpan({ text: `${item.emoji} ${item.name} — 🪙 ${item.price}` });
    if (item.desc) info.createEl("small", { text: item.desc });

    const actions = row.createDiv({ cls: "questlog-shop-item-actions" });

    const buyBtn = actions.createEl("button", { text: "Buy" });
    buyBtn.disabled = balance(this.plugin.data.state) < item.price;
    buyBtn.onclick = async () => {
      const r = buy(this.plugin.data.state, item);
      if (!r.ok) { new Notice("Not enough coins"); return; }
      await this.plugin.saveState();
      this.plugin.afterEconomyChange();
      await this.render();
    };

    if (canRedeem) {
      const redeemBtn = actions.createEl("button", { text: "Redeem" });
      redeemBtn.disabled = owned <= 0;
      redeemBtn.onclick = async () => {
        const r = redeem(this.plugin.data.state, item.id);
        if (!r.ok) { new Notice("None to redeem"); return; }
        await this.plugin.saveState();
        this.plugin.afterEconomyChange();
        new Notice(`Redeemed ${item.name}`);
        await this.render();
      };
    }
  }
}
