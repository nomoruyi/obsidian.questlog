import { App, Editor, Modal, Notice } from "obsidian";
import { Priority, Difficulty } from "../types";
import { setPrefixedTag, setCategory, normalizeTagOrder } from "../tags/edit";
import { currentTags, questText, uniquePrefixes, LineTags } from "../tags/palette";

// Any "- " list bullet: checkbox tasks AND plain bullets, matching what the
// context menu has always acted on.
const LIST_LINE = /^\s*-\s+\S/;

// Every "- " list line in the selection, or the single caret line.
export function listLinesAt(editor: Editor): number[] {
  const from = editor.getCursor("from");
  const to = editor.getCursor("to");
  const start = Math.min(from.line, to.line);
  const end = Math.max(from.line, to.line);
  const out: number[] = [];
  for (let n = start; n <= end; n++) {
    if (LIST_LINE.test(editor.getLine(n))) out.push(n);
  }
  return out;
}

type RowId = "prio" | "diff" | "cat";
const ROWS: RowId[] = ["prio", "diff", "cat"];

interface Choice { value: string; label: string; key: string; }

const PRIO_CHOICES: Choice[] = [
  { value: "must",   label: "‼️ Must",   key: "m" },
  { value: "should", label: "❗ Should", key: "s" },
  { value: "could",  label: "❕ Could",  key: "c" },
];

const DIFF_CHOICES: Choice[] = [
  { value: "easy",   label: "🟢 Easy",   key: "e" },
  { value: "medium", label: "🟡 Medium", key: "m" },
  { value: "hard",   label: "🔴 Hard",   key: "h" },
];

const ROW_LABEL: Record<RowId, string> = {
  prio: "Priority", diff: "Difficulty", cat: "Category",
};

// One palette for both flows. It takes write-units: a unit is the set of lines
// that receive one set of tags. A single caret line is [[5]], a three-line
// selection is [[5,6,7]], a seven-mission sweep is [[3],[4],[7],…]. Only the
// counter and the skip hint differ between them.
export class TagPaletteModal extends Modal {
  private idx = 0;                  // which write-unit we are on
  private row: RowId = "prio";      // which row the keyboard is listening to
  private visited: Record<RowId, boolean> = { prio: false, diff: false, cat: false };
  private sel: LineTags = { prio: "should", diff: "medium", cat: "general" };
  private buffer = "";              // category type-ahead
  private applied = 0;
  private catChoices: Choice[];

  constructor(
    app: App,
    private editor: Editor,
    private units: number[][],
    private skills: string[],
    glyphs: Record<string, string>,
  ) {
    super(app);
    const keys = uniquePrefixes(skills);
    this.catChoices = skills.map((s, i) => ({
      value: s,
      label: `${glyphs[s] ?? "🏷️"} ${s}`,
      key: keys[i],
    }));
  }

  private get sweeping(): boolean { return this.units.length > 1; }

  onOpen() {
    this.modalEl.addClass("questlog-palette");
    // One catch-all handler rather than several registrations, so there is no
    // question about which fires first. Escape is handled here too, instead of
    // relying on Modal's own registration ordering.
    this.scope.register(null, null, (evt) => this.onKey(evt));
    this.beginUnit();
  }

  onClose() {
    this.contentEl.empty();
    if (this.sweeping) {
      new Notice(`QuestLog: tagged ${this.applied} of ${this.units.length} missions.`);
    }
  }

  private beginUnit() {
    this.sel = currentTags(this.editor.getLine(this.units[this.idx][0]), this.skills);
    this.row = "prio";
    this.visited = { prio: false, diff: false, cat: false };
    this.buffer = "";
    this.render();
  }

  private choicesFor(row: RowId): Choice[] {
    if (row === "prio") return PRIO_CHOICES;
    if (row === "diff") return DIFF_CHOICES;
    return this.catChoices;
  }

  // --- keyboard -----------------------------------------------------------

  private onKey(evt: KeyboardEvent): boolean {
    // Never swallow a modified chord — Ctrl+W and friends must still reach the
    // app, and evt.key for them is a single character like "w".
    if (evt.ctrlKey || evt.metaKey || evt.altKey) return true;

    switch (evt.key) {
      case "Escape":     this.close(); return false;
      case "Enter":      this.commit(this.row, this.sel[this.row]); return false;
      case "Backspace":  this.back(); return false;
      case "Tab":        if (this.sweeping) { this.next(); } return false;
      case "ArrowRight": this.move(1); return false;
      case "ArrowLeft":  this.move(-1); return false;
      default:
        if (evt.key.length === 1) { this.typeKey(evt.key.toLowerCase()); return false; }
        return true;
    }
  }

  // Move the highlight within the active row. The highlight IS the pending
  // value, so there is no second piece of state to keep in sync.
  private move(step: number) {
    const choices = this.visibleChoices(this.row);
    if (choices.length === 0) return;
    const at = choices.findIndex((c) => c.value === this.sel[this.row]);
    const nextAt = (((at === -1 ? 0 : at + step) % choices.length) + choices.length) % choices.length;
    this.setSel(this.row, choices[nextAt].value);
    this.render();
  }

  private typeKey(ch: string) {
    if (this.row !== "cat") {
      const hit = this.choicesFor(this.row).find((c) => c.key === ch);
      if (hit) this.commit(this.row, hit.value);
      return;
    }

    const buf = this.buffer + ch;
    const hits = this.catChoices.filter((c) => c.value.startsWith(buf));
    if (hits.length === 0) { this.buffer = ""; this.render(); return; }
    if (hits.length === 1) { this.buffer = ""; this.commit("cat", hits[0].value); return; }

    // Several still match. An exact spelling (home, with homework also live)
    // highlights itself and waits for Enter; otherwise the first candidate.
    this.buffer = buf;
    const exact = hits.find((c) => c.value === buf);
    this.setSel("cat", (exact ?? hits[0]).value);
    this.render();
  }

  // --- row state ----------------------------------------------------------

  private visibleChoices(row: RowId): Choice[] {
    const all = this.choicesFor(row);
    if (row === "cat" && this.row === "cat" && this.buffer !== "") {
      return all.filter((c) => c.value.startsWith(this.buffer));
    }
    return all;
  }

  private setSel(row: RowId, value: string) {
    if (row === "prio") this.sel.prio = value as Priority;
    else if (row === "diff") this.sel.diff = value as Difficulty;
    else this.sel.cat = value;
  }

  // Set a row and move on. Clicking a row the keyboard has not reached yet is
  // allowed: it resolves that row and the focus jumps to the first row still
  // unvisited.
  private commit(row: RowId, value: string) {
    this.setSel(row, value);
    this.visited[row] = true;
    this.buffer = "";

    const pending = ROWS.find((r) => !this.visited[r]);
    if (pending === undefined) { this.apply(); return; }
    this.row = pending;
    this.render();
  }

  private back() {
    const at = ROWS.indexOf(this.row);
    if (at === 0) return;
    this.row = ROWS[at - 1];
    this.visited[this.row] = false;
    this.buffer = "";
    this.render();
  }

  // --- writing ------------------------------------------------------------

  private apply() {
    const { prio, diff, cat } = this.sel;
    for (const n of this.units[this.idx]) {
      let out = setPrefixedTag(this.editor.getLine(n), "prio", prio);
      out = setPrefixedTag(out, "diff", diff);
      out = setCategory(out, cat);
      this.editor.setLine(n, normalizeTagOrder(out, this.skills));
    }
    this.applied++;
    this.next();
  }

  private next() {
    this.idx++;
    if (this.idx >= this.units.length) { this.close(); return; }
    this.beginUnit();
  }

  // --- rendering ----------------------------------------------------------

  private render() {
    const el = this.contentEl;
    el.empty();

    const head = el.createDiv({ cls: "ql-palette-head" });
    head.createSpan({ text: questText(this.editor.getLine(this.units[this.idx][0])) });
    if (this.sweeping) {
      head.createSpan({ cls: "ql-palette-count", text: `${this.idx + 1} / ${this.units.length}` });
    }

    for (const r of ROWS) this.renderRow(el, r);

    const foot = el.createDiv({ cls: "ql-palette-foot" });
    foot.createDiv({ text: `→ #prio/${this.sel.prio}  #diff/${this.sel.diff}  #${this.sel.cat}` });
    foot.createDiv({
      cls: "ql-palette-hint",
      text: this.sweeping
        ? "⏎ keep · ⌫ back · ⇥ skip mission · Esc stop"
        : "⏎ keep · ⌫ back · Esc cancel",
    });
  }

  private renderRow(parent: HTMLElement, row: RowId) {
    const active = this.row === row;
    const el = parent.createDiv({ cls: `ql-palette-row${active ? " is-active" : ""}` });
    el.createDiv({
      cls: "ql-palette-label",
      text: active ? ROW_LABEL[row].toUpperCase() : ROW_LABEL[row],
    });

    // Every row shows every chip. The keyboard walks the rows in order, but the
    // mouse has to be able to reach into a row it has not arrived at yet —
    // clicking Hard while Priority is active is the whole point of the flat
    // layout. Inactive rows are dimmed and drop their key hints.
    const chips = el.createDiv({ cls: "ql-palette-chips" });
    for (const c of this.visibleChoices(row)) {
      const chip = chips.createEl("button", { cls: "ql-palette-chip", text: c.label });
      if (this.sel[row] === c.value) chip.addClass("is-current");
      if (active) chip.createSpan({ cls: "ql-palette-key", text: c.key });
      chip.onclick = () => this.commit(row, c.value);
    }
  }
}
