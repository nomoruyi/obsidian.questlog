import { App, PluginSettingTab, Setting } from "obsidian";
import QuestLogPlugin from "../../main";
import { Priority, Difficulty } from "../types";
import { parseSkillsField, formatSkillsField } from "../config";

const PRIORITIES: Priority[] = ["must", "should", "could"];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export class QuestLogSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: QuestLogPlugin) { super(app, plugin); }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    const cfg = this.plugin.data.config;

    containerEl.createEl("h3", { text: "XP grid (priority × difficulty)" });
    for (const p of PRIORITIES) {
      for (const d of DIFFICULTIES) {
        new Setting(containerEl)
          .setName(`${p} / ${d}`)
          .addText((t) =>
            t.setValue(String(cfg.xpGrid[p][d])).onChange(async (v) => {
              const n = Number(v);
              if (!Number.isNaN(n)) { cfg.xpGrid[p][d] = n; await this.plugin.saveState(); }
            }),
          );
      }
    }

    containerEl.createEl("h3", { text: "Coin grid (priority × difficulty)" });
    for (const p of PRIORITIES) {
      for (const d of DIFFICULTIES) {
        new Setting(containerEl)
          .setName(`${p} / ${d}`)
          .addText((t) =>
            t.setValue(String(cfg.coinGrid[p][d])).onChange(async (v) => {
              const n = Number(v);
              if (!Number.isNaN(n)) { cfg.coinGrid[p][d] = n; await this.plugin.saveState(); }
            }),
          );
      }
    }

    new Setting(containerEl)
      .setName("Rewards note path")
      .setDesc("Vault path to the custom rewards note. One item per line: emoji | name | price | desc.")
      .addText((t) =>
        t.setValue(cfg.rewardsNotePath).onChange(async (v) => {
          cfg.rewardsNotePath = v.trim();
          await this.plugin.saveState();
        }),
      );

    containerEl.createEl("h3", { text: "Consistency (HP & streak)" });

    new Setting(containerEl)
      .setName("Enable HP system")
      .setDesc("HP pool, damage, setback, and potion effects. Off = streak still works.")
      .addToggle((t) =>
        t.setValue(cfg.hpEnabled).onChange(async (v) => { cfg.hpEnabled = v; await this.plugin.saveState(); this.plugin.afterEconomyChange(); }),
      );

    new Setting(containerEl)
      .setName("Enable streak system")
      .setDesc("Streak counter and freeze-token insurance at finalize.")
      .addToggle((t) =>
        t.setValue(cfg.streakEnabled).onChange(async (v) => { cfg.streakEnabled = v; await this.plugin.saveState(); this.plugin.afterEconomyChange(); }),
      );

    const numField = (name: string, get: () => number, set: (n: number) => void) =>
      new Setting(containerEl).setName(name).addText((t) =>
        t.setValue(String(get())).onChange(async (v) => {
          const n = Number(v);
          if (!Number.isNaN(n)) { set(n); await this.plugin.saveState(); }
        }),
      );

    numField("Starting max HP", () => cfg.startingMaxHP, (n) => (cfg.startingMaxHP = n));
    numField("Daily regen", () => cfg.defaultRegen, (n) => (cfg.defaultRegen = n));

    numField("Undone penalty — must", () => cfg.undonePenalty.must, (n) => (cfg.undonePenalty.must = n));
    numField("Undone penalty — should", () => cfg.undonePenalty.should, (n) => (cfg.undonePenalty.should = n));
    numField("Undone penalty — could", () => cfg.undonePenalty.could, (n) => (cfg.undonePenalty.could = n));

    numField("Vice loss — hard", () => cfg.viceLoss.hard, (n) => (cfg.viceLoss.hard = n));
    numField("Vice loss — medium", () => cfg.viceLoss.medium, (n) => (cfg.viceLoss.medium = n));
    numField("Vice loss — easy", () => cfg.viceLoss.easy, (n) => (cfg.viceLoss.easy = n));

    new Setting(containerEl)
      .setName("Setback mode")
      .setDesc("What happens when HP hits 0.")
      .addDropdown((d) =>
        d.addOption("level-floor", "Reset XP to level floor")
          .addOption("lose-percent", "Lose a % of level progress")
          .addOption("off", "Off (soft wall, no XP loss)")
          .setValue(cfg.setbackMode)
          .onChange(async (v) => { cfg.setbackMode = v as typeof cfg.setbackMode; await this.plugin.saveState(); }),
      );

    numField("Setback percent (lose-percent mode)", () => cfg.setbackPercent, (n) => (cfg.setbackPercent = n));

    numField("Minor potion price", () => cfg.potionPrices.minor, (n) => (cfg.potionPrices.minor = n));
    numField("Potion price", () => cfg.potionPrices.normal, (n) => (cfg.potionPrices.normal = n));
    numField("Major potion price", () => cfg.potionPrices.major, (n) => (cfg.potionPrices.major = n));
    numField("Max-HP upgrade price", () => cfg.maxHpUpgradePrice, (n) => (cfg.maxHpUpgradePrice = n));
    numField("Max-HP upgrade amount", () => cfg.maxHpUpgradeAmount, (n) => (cfg.maxHpUpgradeAmount = n));
    numField("Regen upgrade price", () => cfg.regenUpgradePrice, (n) => (cfg.regenUpgradePrice = n));
    numField("Regen upgrade amount", () => cfg.regenUpgradeAmount, (n) => (cfg.regenUpgradeAmount = n));

    new Setting(containerEl)
      .setName("Reset settlement date to today")
      .setDesc("Skips any unsettled backlog with no penalty. Use if the date drifts.")
      .addButton((b) =>
        b.setButtonText("Reset to today").onClick(async () => {
          this.plugin.data.state.lastSettledDate = (window as any).moment().format("YYYY-MM-DD");
          await this.plugin.saveState();
          this.plugin.afterEconomyChange();
        }),
      );

    new Setting(containerEl)
      .setName("Freeze price")
      .addText((t) =>
        t.setValue(String(cfg.freezePrice)).onChange(async (v) => {
          const n = Number(v);
          if (!Number.isNaN(n)) { cfg.freezePrice = n; await this.plugin.saveState(); }
        }),
      );

    new Setting(containerEl)
      .setName("Finalize day reward")
      .setDesc("Coins per processed day at finalize. Missed days earn nothing. 0 = off.")
      .addText((t) =>
        t.setValue(String(cfg.finalizeDayReward)).onChange(async (v) => {
          const n = Number(v);
          if (!Number.isNaN(n)) { cfg.finalizeDayReward = n; await this.plugin.saveState(); }
        }),
      );

    containerEl.createEl("h3", { text: "Celebrations" });

    new Setting(containerEl)
      .setName("Level-up confetti")
      .setDesc("Confetti burst in the finalize recap when you level up or rank up.")
      .addToggle((t) =>
        t.setValue(cfg.confettiEnabled).onChange(async (v) => { cfg.confettiEnabled = v; await this.plugin.saveState(); }),
      );

    new Setting(containerEl)
      .setName("Level-up sound")
      .setDesc("Short synthesized fanfare in the finalize recap on a level-up or rank-up.")
      .addToggle((t) =>
        t.setValue(cfg.sfxEnabled).onChange(async (v) => { cfg.sfxEnabled = v; await this.plugin.saveState(); }),
      );

    new Setting(containerEl)
      .setName("Roll over unfinished missions")
      .setDesc("At finalize, copy unfinished missions from the most-recent settled note into today's note.")
      .addToggle((t) =>
        t.setValue(cfg.missionRolloverEnabled).onChange(async (v) => { cfg.missionRolloverEnabled = v; await this.plugin.saveState(); }),
      );

    new Setting(containerEl)
      .setName("Skills (name=emoji, comma-separated)")
      .setDesc("Each skill is a category and a glyph, e.g. body=💪, mind=🧠. Missing emoji → 🏷️.")
      .addText((t) =>
        t.setValue(formatSkillsField(cfg.skills, cfg.skillGlyphs)).onChange(async (v) => {
          const { skills, glyphs } = parseSkillsField(v);
          cfg.skills = skills;
          cfg.skillGlyphs = glyphs;
          await this.plugin.saveState();
          this.plugin.refreshEditors();
        }),
      );

    new Setting(containerEl)
      .setName("Quest marker tag")
      .setDesc("Only notes containing this tag count toward score/XP (without the '#'). Leave empty to count every periodic note.")
      .addText((t) =>
        t.setValue(cfg.questMarker).onChange(async (v) => {
          cfg.questMarker = v.trim().replace(/^#/, "");
          await this.plugin.saveState();
        }),
      );

    new Setting(containerEl)
      .setName("Rank titles (comma-separated, one per 10 levels)")
      .addText((t) =>
        t.setValue(cfg.rankTitles.join(", ")).onChange(async (v) => {
          cfg.rankTitles = v.split(",").map((s) => s.trim()).filter(Boolean);
          await this.plugin.saveState();
        }),
      );

    new Setting(containerEl)
      .setName("Reset all progress")
      .setDesc("Wipes XP, levels, skills, coins and inventory back to zero. Cannot be undone.")
      .addButton((b) =>
        b.setButtonText("Reset all").setWarning().onClick(async () => {
          if (confirm("Reset all QuestLog progress?")) await this.plugin.resetAll();
        }),
      );
  }
}
