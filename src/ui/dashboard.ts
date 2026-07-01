import { ItemView, WorkspaceLeaf, Notice } from "obsidian";
import QuestLogPlugin from "../../main";
import { levelProgress, rankForLevel } from "../engine/levels";
import { balance } from "../state/state";
import { builtinItems } from "../shop/rewards";
import { useItem } from "../shop/shop";
import { ShopModal } from "./shop";

export const QUESTLOG_VIEW = "questlog-dashboard";

export class DashboardView extends ItemView {
  constructor(leaf: WorkspaceLeaf, private plugin: QuestLogPlugin) { super(leaf); }

  getViewType() { return QUESTLOG_VIEW; }
  getDisplayText() { return "QuestLog"; }
  getIcon() { return "swords"; }

  async onOpen() {
    this.plugin.onDashboardRefresh(() => this.render());
    this.render();
  }

  render() {
    const { config, state } = this.plugin.data;
    const el = this.contentEl;
    el.empty();
    el.addClass("questlog-dashboard");

    const prog = levelProgress(state.overallXp, config.levelBase, config.levelExponent);
    const rank = rankForLevel(prog.level, config.rankTitles);

    el.createEl("h3", { text: `⚔ ${rank.toUpperCase()} · Level ${prog.level}` });
    this.bar(el, prog.into, prog.needed, `${prog.into} / ${prog.needed} XP`);

    if (config.hpEnabled) {
      el.createEl("div", { text: "Health", cls: "questlog-skills-header" });
      this.bar(el, state.hp, state.maxHP, `${state.hp} / ${state.maxHP} HP`, "questlog-hp");
    }

    if (config.streakEnabled) {
      const freeze = state.inventory["freeze"] ?? 0;
      el.createEl("p", { text: `🔥 Streak: ${state.streak} days · 🧊 ${freeze} freeze`, cls: "questlog-streak" });
    }

    if (config.hpEnabled || config.streakEnabled) {
      const last = state.lastSettledDate ?? "never";
      el.createEl("p", { text: `📅 Last finalized: ${last}`, cls: "questlog-laststamp" });
    }

    el.createEl("p", {
      text: `🪙 Balance: ${balance(state)}  (earned ${state.coinsEarned} · spent ${state.coinsSpent})`,
      cls: "questlog-balance",
    });

    el.createEl("h4", { text: "Skills", cls: "questlog-skills-header" });
    // The skills setting is the single source of truth: only configured skills
    // appear, even if legacy/stray categories still linger in state.skills.
    const skills = Object.keys(state.skills).filter((k) => config.skills.includes(k)).sort();
    if (skills.length === 0) el.createEl("p", { text: "No skill XP yet." });
    for (const skill of skills) {
      const xp = state.skills[skill];
      const sp = levelProgress(xp, config.levelBase, config.levelExponent);
      const row = el.createDiv({ cls: "questlog-skill" });
      row.createEl("div", { text: `${skill.toUpperCase()} · Level ${sp.level}` });
      this.bar(row, sp.into, sp.needed, `${sp.into} / ${sp.needed} XP`);
    }

    el.createEl("h4", { text: "Inventory", cls: "questlog-inventory-header" });
    const owned = Object.keys(state.inventory).filter((k) => state.inventory[k] > 0).sort();
    if (owned.length === 0) {
      el.createEl("p", { text: "(empty)" });
    } else {
      const builtinById = new Map(builtinItems(config).map((i) => [i.id, i]));
      for (const id of owned) {
        const bi = builtinById.get(id);
        const label = bi ? `${bi.emoji} ${bi.name}` : id;
        const row = el.createDiv();
        row.createSpan({ text: `${label} ×${state.inventory[id]}` });
        if (bi && bi.effect.type !== "none") {
          const useBtn = row.createEl("button", { text: "Use" });
          useBtn.onclick = async () => {
            const r = useItem(state, id, config);
            if (!r.ok) { new Notice("Can't use that item."); return; }
            await this.plugin.saveState();
            this.plugin.afterEconomyChange();
            this.render();
          };
        }
      }
    }

    const actions = el.createDiv({ cls: "questlog-actions" });
    const finalizeBtn = actions.createEl("button", { text: "Finalize Day", cls: "questlog-finalize-btn" });
    finalizeBtn.onclick = () => void this.plugin.finalizeDays();

    const shopBtn = actions.createEl("button", { text: "Open Shop", cls: "questlog-shop-btn" });
    shopBtn.onclick = () => new ShopModal(this.app, this.plugin).open();
  }

  private bar(parent: HTMLElement, value: number, max: number, label: string, extraClass?: string) {
    const wrap = parent.createDiv({ cls: extraClass ? `questlog-bar ${extraClass}` : "questlog-bar" });
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
    const span = wrap.createSpan();
    span.style.width = `${pct}%`;
    parent.createEl("small", { text: label });
  }
}
