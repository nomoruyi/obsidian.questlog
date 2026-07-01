import { MarkdownPostProcessorContext } from "obsidian";
import QuestLogPlugin from "../../main";
import { resolveGlyph } from "./glyphs";
import { classifyPeriodic } from "../vault/periodic";
import { levelProgress, rankForLevel } from "../engine/levels";

export function renderReading(plugin: QuestLogPlugin) {
  return (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
    // 1) Glyph tags inside any list item — checkbox tasks AND plain bullets
    //    (so bare-bullet vice lines get decorated too). resolveGlyph returns
    //    null for non-eligible tags, leaving them as normal links.
    el.querySelectorAll("li a.tag").forEach((a) => {
      const raw = (a.textContent ?? "").trim();
      const glyph = resolveGlyph(raw.replace(/^#/, "").toLowerCase(), plugin.data.config.skillGlyphs);
      if (glyph === null) return;
      const span = document.createElement("span");
      span.className = "ql-glyph";
      span.textContent = glyph;
      span.setAttribute("title", raw);
      a.replaceWith(span);
    });

    // 2) Rank badge after the first H1 of a marked periodic note.
    const cfg = plugin.data.config;
    if (!classifyPeriodic(ctx.sourcePath, plugin.periodicFolders())) return;
    const marker = cfg.questMarker.trim().replace(/^#/, "").toLowerCase();
    if (marker !== "") {
      const tags = plugin.app.metadataCache.getCache(ctx.sourcePath)?.tags ?? [];
      const has = tags.some((t) => t.tag.replace(/^#/, "").toLowerCase() === marker);
      if (!has) return;
    }
    const h1 = el.querySelector("h1");
    if (!h1 || h1.querySelector(".ql-rank-badge")) return;
    const prog = levelProgress(plugin.data.state.overallXp, cfg.levelBase, cfg.levelExponent);
    const badge = document.createElement("span");
    badge.className = "ql-rank-badge";
    badge.textContent = ` ⚔ ${rankForLevel(prog.level, cfg.rankTitles).toUpperCase()} · Level ${prog.level}`;
    h1.appendChild(badge);
  };
}
