import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType } from "@codemirror/view";
import { StateEffect, RangeSetBuilder } from "@codemirror/state";
import { editorInfoField } from "obsidian";
import QuestLogPlugin from "../../main";
import { glyphSpans } from "./glyphs";
import { classifyPeriodic } from "../vault/periodic";
import { noteHasMarker } from "../parser/marker";
import { levelProgress, rankForLevel } from "../engine/levels";

// Dispatched by the plugin to force a rebuild (skills or XP changed).
export const qlRefresh = StateEffect.define<null>();

class GlyphWidget extends WidgetType {
  constructor(private glyph: string, private raw: string) { super(); }
  eq(other: GlyphWidget) { return other.glyph === this.glyph && other.raw === this.raw; }
  toDOM() {
    const span = document.createElement("span");
    span.className = "ql-glyph";
    span.textContent = this.glyph;
    span.setAttribute("aria-label", this.raw);
    return span;
  }
  ignoreEvent() { return false; } // let clicks place the caret -> reveals the raw line
}

class BadgeWidget extends WidgetType {
  constructor(private text: string) { super(); }
  eq(other: BadgeWidget) { return other.text === this.text; }
  toDOM() {
    const span = document.createElement("span");
    span.className = "ql-rank-badge";
    span.textContent = this.text;
    return span;
  }
}

export function glyphDecorator(plugin: QuestLogPlugin) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) { this.decorations = this.build(view); }

      update(u: ViewUpdate) {
        if (
          u.docChanged || u.selectionSet || u.viewportChanged ||
          u.transactions.some((t) => t.effects.some((e) => e.is(qlRefresh)))
        ) {
          this.decorations = this.build(u.view);
        }
      }

      build(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const cfg = plugin.data.config;
        const skillGlyphs = cfg.skillGlyphs;

        // Badge eligibility: a periodic note carrying the quest marker.
        const file = view.state.field(editorInfoField, false)?.file ?? null;
        const periodic = file ? classifyPeriodic(file.path, plugin.periodicFolders()) : null;
        const showBadge = !!periodic && noteHasMarker(view.state.doc.toString(), cfg.questMarker);
        let badgeText = "";
        if (showBadge) {
          const prog = levelProgress(plugin.data.state.overallXp, cfg.levelBase, cfg.levelExponent);
          badgeText = ` ⚔ ${rankForLevel(prog.level, cfg.rankTitles).toUpperCase()} · Level ${prog.level}`;
        }
        let badgeDone = false;

        // Lines touched by any selection render raw (caret-aware reveal).
        const caretLines = new Set<number>();
        for (const r of view.state.selection.ranges) {
          const a = view.state.doc.lineAt(r.from).number;
          const b = view.state.doc.lineAt(r.to).number;
          for (let n = a; n <= b; n++) caretLines.add(n);
        }

        for (const { from, to } of view.visibleRanges) {
          let pos = from;
          while (pos <= to) {
            const line = view.state.doc.lineAt(pos);

            if (!caretLines.has(line.number)) {
              for (const s of glyphSpans(line.text, skillGlyphs)) {
                builder.add(
                  line.from + s.from,
                  line.from + s.to,
                  Decoration.replace({ widget: new GlyphWidget(s.glyph, line.text.slice(s.from, s.to)) }),
                );
              }
            }

            // Badge after the first H1 ("# Title" needs a space; "#Daily" is excluded).
            if (showBadge && !badgeDone && /^#\s+/.test(line.text)) {
              builder.add(line.to, line.to, Decoration.widget({ widget: new BadgeWidget(badgeText), side: 1 }));
              badgeDone = true;
            }

            pos = line.to + 1;
          }
        }
        return builder.finish();
      }
    },
    { decorations: (v) => v.decorations },
  );
}
