import { App, Modal } from "obsidian";
import { Recap } from "../engine/recap";
import { planCelebration, sfxSequence } from "../engine/celebration";
import { fireConfetti } from "../render/confetti";
import { playSfx } from "../render/sfx";

export interface RecapModalOpts {
  confetti: boolean;
  sfx: boolean;
}

function cap(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export class RecapModal extends Modal {
  private disposers: Array<() => void> = [];

  constructor(
    app: App,
    private recap: Recap,
    private opts: RecapModalOpts,
    private rollover: { rolled: number; blocked: number },
  ) { super(app); }

  onClose() {
    for (const d of this.disposers) d();
    this.disposers = [];
    this.contentEl.empty();
  }

  onOpen() {
    const r = this.recap;
    const el = this.contentEl;
    el.empty();
    el.addClass("questlog-recap");

    el.createEl("h2", { text: "Day finalized" });
    el.createEl("p", {
      text: `📅 ${r.fromISO} → ${r.toISO} · ${r.daysSettled} done, ${r.missedDays} missed`,
      cls: "questlog-recap-sub",
    });

    // Haul
    const haul = el.createDiv({ cls: "questlog-recap-section" });
    haul.createEl("p", { text: `🪙 +${r.coinsGained} coins · ✨ +${r.xpGained} XP` });
    if (r.dayRewardCoins > 0) {
      haul.createEl("p", { text: `🎁 +${r.dayRewardCoins} finalize bonus · ${r.daysSettled} day(s)` });
    }

    // Missions rolled over from the previous note
    const ro = this.rollover;
    if (ro.rolled > 0 || ro.blocked > 0) {
      const mi = el.createDiv({ cls: "questlog-recap-section" });
      if (ro.rolled > 0) {
        mi.createEl("p", { text: `🔄 ${ro.rolled} mission${ro.rolled === 1 ? "" : "s"} rolled over` });
      }
      if (ro.blocked > 0) {
        mi.createEl("p", {
          text: `⚠️ today's note missing — ${ro.blocked} not rolled`,
          cls: "questlog-recap-warn",
        });
      }
    }

    // HP
    const hp = el.createDiv({ cls: "questlog-recap-section" });
    hp.createEl("p", { text: `❤️ ${r.hpStart} → ${r.hpEnd}` });
    hp.createEl("small", {
      text: `regen +${r.hpRegen} · damage −${r.hpDamage}`,
      cls: "questlog-recap-sub",
    });
    if (r.setbackFired) {
      hp.createEl("p", {
        text: "⚠️ HP hit 0 — progress reset to level floor",
        cls: "questlog-recap-warn",
      });
    }

    // Streak (only when something changed or a token was spent)
    const streakChanged = r.streakBefore !== r.streakAfter;
    if (streakChanged || r.tokensUsed > 0) {
      const streak = el.createDiv({ cls: "questlog-recap-section" });
      if (streakChanged) streak.createEl("p", { text: `🔥 ${r.streakBefore} → ${r.streakAfter}` });
      if (r.tokensUsed > 0) streak.createEl("p", { text: `🧊 ${r.tokensUsed} freeze used` });
    }

    // Level-ups
    const lv = el.createDiv({ cls: "questlog-recap-section" });
    lv.createEl("h3", { text: "Level-ups" });
    const overallRose = r.overallAfter > r.overallBefore;
    const rankChanged = r.rankBefore !== r.rankAfter;
    if (r.skillLevelUps.length === 0 && !overallRose && !rankChanged) {
      lv.createEl("p", { text: "No level-ups." });
    } else {
      for (const s of r.skillLevelUps) {
        lv.createEl("p", {
          text: `⬆️ ${cap(s.skill)} L${s.before}→L${s.after}`,
          cls: "questlog-recap-levelup",
        });
      }
      if (overallRose) {
        lv.createEl("p", {
          text: `⬆️ Overall L${r.overallBefore}→L${r.overallAfter}`,
          cls: "questlog-recap-levelup",
        });
      }
      if (rankChanged) {
        lv.createEl("p", {
          text: `🎖️ Rank: ${r.rankBefore} → ${r.rankAfter}`,
          cls: "questlog-recap-levelup",
        });
      }
    }

    // Close
    const btnRow = el.createDiv({ cls: "questlog-recap-section" });
    const close = btnRow.createEl("button", { text: "Close" });
    close.onclick = () => this.close();

    // Juice: confetti + sound when the recap contains a level-up / rank change.
    const tier = planCelebration(r);
    if (tier !== "none") {
      if (this.opts.confetti) this.disposers.push(fireConfetti(tier));
      if (this.opts.sfx) this.disposers.push(playSfx(sfxSequence(tier)));
    }
  }
}
