import { Editor, Menu } from "obsidian";
import QuestLogPlugin from "../../main";
import { toggleVice, hasVice, normalizeTagOrder } from "../tags/edit";
import { TagPaletteModal, listLinesAt } from "./tagPalette";

export function registerTagMenu(plugin: QuestLogPlugin): void {
  plugin.registerEvent(
    plugin.app.workspace.on("editor-menu", (menu: Menu, editor: Editor) => {
      const lines = listLinesAt(editor);
      if (lines.length === 0) return;
      const cfg = plugin.data.config;

      menu.addItem((item) => {
        item
          .setTitle("Tag quest")
          .setIcon("swords")
          .onClick(() => {
            new TagPaletteModal(plugin.app, editor, [lines], cfg.skills, cfg.skillGlyphs).open();
          });
      });

      // Vice was a leaf inside the old "Tag quest" submenu. "Tag quest" is now a
      // click action and cannot also be a submenu parent, so Vice moves up a
      // level. Same toggle, same checked state, one click closer.
      menu.addItem((item) => {
        item
          .setTitle("Vice")
          .setIcon("skull")
          .setChecked(hasVice(editor.getLine(lines[0])))
          .onClick(() => {
            for (const n of lines) {
              editor.setLine(n, normalizeTagOrder(toggleVice(editor.getLine(n)), cfg.skills));
            }
          });
      });
    }),
  );
}
