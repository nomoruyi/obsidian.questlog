import { Plugin, TFile, debounce, Notice } from "obsidian";
import { QuestLogConfig, DEFAULT_CONFIG } from "./src/config";
import { GameState, defaultState, Contribution, balance } from "./src/state/state";
import { applyContribution, removeContribution } from "./src/state/ledger";
import { parseNote } from "./src/parser/parser";
import { noteHasMarker } from "./src/parser/marker";
import { normalizeTagOrder } from "./src/tags/edit";
import { computeScore } from "./src/engine/scoring";
import { aggregateXp } from "./src/engine/xp";
import { aggregateCoins } from "./src/engine/coins";
import { settleDays, formatSettlement, addDays } from "./src/engine/settlement";
import { todayISO, buildNoteMap, dailyPathForDate } from "./src/vault/dates";
import { buildRecap } from "./src/engine/recap";
import { extractUnfinishedMissions, insertMissions } from "./src/engine/rollover";
import { RecapModal } from "./src/ui/recapModal";
import { classifyPeriodic, PeriodicFolders } from "./src/vault/periodic";
import { upsertQuestLogBlock, buildScoreBlock } from "./src/vault/writeback";
import { levelProgress, rankForLevel } from "./src/engine/levels";
import { DashboardView, QUESTLOG_VIEW } from "./src/ui/dashboard";
import { QuestLogSettingTab } from "./src/ui/settings";
import { registerTagMenu } from "./src/ui/contextmenu";
import { glyphDecorator, qlRefresh } from "./src/render/livepreview";
import { renderReading } from "./src/render/reading";
import { EditorView } from "@codemirror/view";

interface QuestLogData {
  config: QuestLogConfig;
  state: GameState;
}

export default class QuestLogPlugin extends Plugin {
  data!: QuestLogData;
  private statusEl!: HTMLElement;
  private refreshStatus: () => void = () => {};

  async onload() {
    await this.loadState();
    await this.migrateRewardsPath();

    this.registerView(QUESTLOG_VIEW, (leaf) => new DashboardView(leaf, this));
    this.addRibbonIcon("swords", "Open QuestLog", () => this.activateDashboard());
    this.addCommand({ id: "open-dashboard", name: "QuestLog: Open dashboard", callback: () => this.activateDashboard() });
    this.addSettingTab(new QuestLogSettingTab(this.app, this));
    registerTagMenu(this);
    this.registerEditorExtension([glyphDecorator(this)]);
    this.registerMarkdownPostProcessor(renderReading(this));

    this.statusEl = this.addStatusBarItem();
    this.statusEl.addClass("questlog-statusbar");
    this.statusEl.onClickEvent(() => (this.app as any).commands?.executeCommandById?.("questlog:open-dashboard"));

    this.addCommand({
      id: "recompute-active",
      name: "QuestLog: Recompute active note",
      callback: () => { const f = this.app.workspace.getActiveFile(); if (f) void this.processFile(f); },
    });

    this.addCommand({
      id: "finalize-day",
      name: "QuestLog: Finalize day(s)",
      callback: () => void this.finalizeDays(),
    });

    this.addCommand({
      id: "normalize-tags",
      name: "QuestLog: Normalize quest tags in note",
      editorCallback: (editor) => {
        const skills = this.data.config.skills;
        let changed = 0;
        for (let n = 0; n <= editor.lastLine(); n++) {
          const line = editor.getLine(n);
          if (!/^\s*-\s+\S/.test(line)) continue; // only "- " list bullets
          const fixed = normalizeTagOrder(line, skills);
          if (fixed !== line) { editor.setLine(n, fixed); changed++; }
        }
        new Notice(changed === 0
          ? "QuestLog: tags already in order."
          : `QuestLog: reordered tags on ${changed} line${changed === 1 ? "" : "s"}.`);
      },
    });

    const handler = debounce((file: TFile) => void this.processFile(file), 500, true);
    this.registerEvent(this.app.vault.on("modify", (f) => { if (f instanceof TFile) handler(f); }));

    this.updateStatusBar();
  }

  onunload() {}

  periodicFolders(): PeriodicFolders {
    const pn = (this.app as any).plugins?.plugins?.["periodic-notes"]?.settings ?? {};
    return {
      daily: pn?.daily?.folder ?? "",
      weekly: pn?.weekly?.folder ?? "",
      monthly: pn?.monthly?.folder ?? "",
    };
  }

  async processFile(file: TFile) {
    if (file.extension !== "md") return;
    if (!classifyPeriodic(file.path, this.periodicFolders())) return;

    const content = await this.app.vault.read(file);

    // Opt-in gate: only notes carrying the marker tag (e.g. "#Quest") count.
    // A note that loses (or never had) the marker has its prior contribution
    // removed so it stops affecting the totals.
    if (!noteHasMarker(content, this.data.config.questMarker)) {
      if (this.data.state.ledger[file.path]) {
        removeContribution(this.data.state, file.path);
        await this.saveState();
        this.updateStatusBar();
        this.refreshStatus();
        this.refreshEditors();
      }
      return;
    }

    const note = parseNote(content, this.data.config.skills);
    const score = computeScore(note, this.data.config.missionHeading);
    const xp = aggregateXp(note, this.data.config.xpGrid);
    const coins = aggregateCoins(note, this.data.config.coinGrid);

    const contrib: Contribution = { overallXp: xp.overall, perSkill: xp.perSkill, score, coins };
    applyContribution(this.data.state, file.path, contrib);
    await this.saveState();

    const block = buildScoreBlock(score, xp.overall, coins);
    const updated = upsertQuestLogBlock(content, block);
    if (updated !== content) await this.app.vault.modify(file, updated);

    const prog = levelProgress(this.data.state.overallXp, this.data.config.levelBase, this.data.config.levelExponent);
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      fm.ql_score = `${score.done}/${score.total}`;
      fm.ql_xp = xp.overall;
      fm.ql_coins = coins;
      fm.ql_level = prog.level;
    });

    this.updateStatusBar();
    this.refreshStatus();
    this.refreshEditors();
  }

  refreshEditors() {
    this.app.workspace.iterateAllLeaves((leaf) => {
      const cm = (leaf.view as any)?.editor?.cm as EditorView | undefined;
      if (cm) cm.dispatch({ effects: qlRefresh.of(null) });
    });
  }

  updateStatusBar() {
    const { overallXp } = this.data.state;
    const { levelBase, levelExponent, rankTitles } = this.data.config;
    const prog = levelProgress(overallXp, levelBase, levelExponent);
    const rank = rankForLevel(prog.level, rankTitles);
    this.statusEl.setText(`⚔ ${rank} L${prog.level} · ${prog.into}/${prog.needed} XP · 🪙 ${balance(this.data.state)}`);
  }

  afterEconomyChange() {
    this.updateStatusBar();
    this.refreshStatus();
  }

  async finalizeDays() {
    const today = todayISO();

    // First-ever finalize: anchor to today so there is no phantom backlog.
    if (this.data.state.lastSettledDate === null) {
      this.data.state.lastSettledDate = today;
      await this.saveState();
      this.afterEconomyChange();
      new Notice("QuestLog: settlement initialized — nothing to finalize yet.");
      return;
    }

    const fromISO = addDays(this.data.state.lastSettledDate, 1);
    const toISO = addDays(today, -1);
    const overallXpAtStart = this.data.state.overallXp;
    const map = await buildNoteMap(this.app, this.data.config, fromISO, toISO);
    const result = settleDays({
      fromISO,
      todayISO: today,
      noteResolver: (d) => map[d] ?? null,
      state: this.data.state,
      config: this.data.config,
    });
    await this.saveState();
    this.afterEconomyChange();

    if (result.daysSettled + result.missedDays === 0) {
      new Notice(formatSettlement(result));
      return;
    }

    const rollover = await this.rollMissionsIntoToday(map, today);

    const recap = buildRecap({
      fromISO,
      toISO,
      settledNotes: Object.values(map),
      config: this.data.config,
      overallXpAtStart,
      skillsXp: this.data.state.skills,
      dailyRegen: this.data.state.dailyRegen,
      result,
    });
    new RecapModal(this.app, recap, {
      confetti: this.data.config.confettiEnabled,
      sfx: this.data.config.sfxEnabled,
    }, rollover).open();
  }

  // Copy unfinished missions from the most-recent settled note into today's
  // note. Returns counts for the recap. Skips silently when disabled or when
  // there is nothing to roll; reports `blocked` when today's note is unusable.
  async rollMissionsIntoToday(
    map: Record<string, import("./src/types").ParsedNote>,
    today: string,
  ): Promise<{ rolled: number; blocked: number }> {
    if (!this.data.config.missionRolloverEnabled) return { rolled: 0, blocked: 0 };

    const dates = Object.keys(map).sort();
    const sourceDate = dates[dates.length - 1];
    if (!sourceDate) return { rolled: 0, blocked: 0 };

    const sourceFile = this.app.vault.getAbstractFileByPath(dailyPathForDate(this.app, sourceDate));
    if (!(sourceFile instanceof TFile)) return { rolled: 0, blocked: 0 };
    const sourceRaw = await this.app.vault.read(sourceFile);

    const blocks = extractUnfinishedMissions(sourceRaw, this.data.config.missionHeading);
    if (blocks.length === 0) return { rolled: 0, blocked: 0 };

    const todayFile = this.app.vault.getAbstractFileByPath(dailyPathForDate(this.app, today));
    if (!(todayFile instanceof TFile)) return { rolled: 0, blocked: blocks.length };
    const todayRaw = await this.app.vault.read(todayFile);

    const res = insertMissions(todayRaw, this.data.config.missionHeading, blocks);
    if (res.headingMissing) return { rolled: 0, blocked: blocks.length };
    if (res.markdown !== todayRaw) await this.app.vault.modify(todayFile, res.markdown);
    return { rolled: res.inserted, blocked: 0 };
  }

  async activateDashboard() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(QUESTLOG_VIEW)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false)!;
      await leaf.setViewState({ type: QUESTLOG_VIEW, active: true });
    }
    workspace.revealLeaf(leaf);
  }

  // One-time: existing installs persisted the old "rewards.md" default, which
  // shadows the new _questlog convention. Bump the path and relocate the file
  // if present. Custom paths (anything other than the legacy default) are left
  // untouched.
  async migrateRewardsPath() {
    const LEGACY = "rewards.md";
    const TARGET = "_questlog/ql_Rewards.md";
    if (this.data.config.rewardsNotePath !== LEGACY) return;

    this.data.config.rewardsNotePath = TARGET;
    const legacy = this.app.vault.getAbstractFileByPath(LEGACY);
    const target = this.app.vault.getAbstractFileByPath(TARGET);
    if (legacy instanceof TFile && !target) {
      try {
        if (!this.app.vault.getAbstractFileByPath("_questlog")) await this.app.vault.createFolder("_questlog");
        await this.app.fileManager.renameFile(legacy, TARGET);
      } catch {
        /* leave the legacy file in place; the path is still updated */
      }
    }
    await this.saveState();
  }

  async loadState() {
    const saved = (await this.loadData()) as Partial<QuestLogData> | null;
    this.data = {
      config: { ...DEFAULT_CONFIG, ...(saved?.config ?? {}) },
      state: { ...defaultState(), ...(saved?.state ?? {}) },
    };
  }

  async saveState() { await this.saveData(this.data); }

  async resetAll() {
    this.data.state = defaultState();
    this.data.state.maxHP = this.data.config.startingMaxHP;
    this.data.state.hp = this.data.config.startingMaxHP;
    this.data.state.dailyRegen = this.data.config.defaultRegen;
    await this.saveState();
    this.updateStatusBar();
    this.refreshStatus();
    new Notice("QuestLog: all progress reset.");
  }

  onDashboardRefresh(fn: () => void) { this.refreshStatus = fn; }
}
