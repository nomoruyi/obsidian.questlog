import { Editor, Menu } from "obsidian";
import QuestLogPlugin from "../../main";
import { setPrefixedTag, setCategory, toggleOptional, hasOptional, toggleVice, hasVice, normalizeTagOrder } from "../tags/edit";

// Any "- " list bullet: checkbox tasks ("- [ ] …") AND plain bullets
// ("- Cigarettes: 3"), so vices (which must be non-checkbox lines) are taggable.
const LIST_LINE = /^\s*-\s+\S/;

const DIFFICULTIES: [string, string][] = [["Easy", "easy"], ["Medium", "medium"], ["Hard", "hard"]];
const PRIORITIES: [string, string][] = [["Must do", "must"], ["Should do", "should"], ["Could do", "could"]];

function targetLines(editor: Editor): number[] {
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

export function registerTagMenu(plugin: QuestLogPlugin): void {
  plugin.registerEvent(
    plugin.app.workspace.on("editor-menu", (menu: Menu, editor: Editor) => {
      const lines = targetLines(editor);
      if (lines.length === 0) return;

      // Every menu edit also re-orders the line's tags into canonical order
      // (prio → diff → cat → opt → vice), so the menu never leaves them scrambled.
      const skills = plugin.data.config.skills;
      const apply = (fn: (line: string) => string) => {
        for (const n of lines) editor.setLine(n, normalizeTagOrder(fn(editor.getLine(n)), skills));
      };

      menu.addItem((item) => {
        item.setTitle("Tag quest").setIcon("swords");
        const sub = (item as any).setSubmenu() as Menu;

        sub.addItem((pi) => {
          pi.setTitle("Priority");
          const ps = (pi as any).setSubmenu() as Menu;
          for (const [label, value] of PRIORITIES) {
            ps.addItem((leaf) => leaf.setTitle(label).onClick(() => apply((l) => setPrefixedTag(l, "prio", value))));
          }
        });

        sub.addItem((di) => {
          di.setTitle("Difficulty");
          const ds = (di as any).setSubmenu() as Menu;
          for (const [label, value] of DIFFICULTIES) {
            ds.addItem((leaf) => leaf.setTitle(label).onClick(() => apply((l) => setPrefixedTag(l, "diff", value))));
          }
        });

        sub.addItem((ci) => {
          ci.setTitle("Category");
          const cs = (ci as any).setSubmenu() as Menu;
          for (const skill of plugin.data.config.skills) {
            cs.addItem((leaf) => leaf.setTitle(skill).onClick(() => apply((l) => setCategory(l, skill))));
          }
        });

        sub.addItem((leaf) => {
          leaf
            .setTitle("Optional")
            .setChecked(hasOptional(editor.getLine(lines[0])))
            .onClick(() => apply((l) => toggleOptional(l)));
        });

        sub.addItem((leaf) => {
          leaf
            .setTitle("Vice")
            .setChecked(hasVice(editor.getLine(lines[0])))
            .onClick(() => apply((l) => toggleVice(l)));
        });
      });
    }),
  );
}
