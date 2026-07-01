import { App, TFile } from "obsidian";
import { QuestLogConfig } from "../config";
import { parseNote } from "../parser/parser";
import { noteHasMarker } from "../parser/marker";
import { ParsedNote } from "../types";
import { enumerateDates } from "../engine/settlement";

// Obsidian bundles moment and exposes it on window; the named "obsidian" export
// is typed as a namespace and isn't directly callable under this tsconfig.
const moment = (window as any).moment as (...args: any[]) => any;

// Today's local date as ISO "YYYY-MM-DD".
export function todayISO(): string {
  return moment().format("YYYY-MM-DD");
}

// Maps an ISO date to the expected daily-note path using periodic-notes' daily
// folder + moment format (defaults to "YYYY-MM-DD" if the plugin is absent).
export function dailyPathForDate(app: App, dateISO: string): string {
  const pn = (app as any).plugins?.plugins?.["periodic-notes"]?.settings ?? {};
  const folder: string = pn?.daily?.folder ?? "";
  const format: string = pn?.daily?.format || "YYYY-MM-DD";
  const basename = moment(dateISO, "YYYY-MM-DD").format(format);
  const norm = folder.replace(/\/+$/, "");
  return norm ? `${norm}/${basename}.md` : `${basename}.md`;
}

// Reads every existing, marker-bearing daily note in [fromISO, toISO] and returns
// a date -> ParsedNote map. Dates with no file (or no marker) are simply absent;
// the settlement resolver reports their absence as a missed day.
export async function buildNoteMap(
  app: App, config: QuestLogConfig, fromISO: string, toISO: string,
): Promise<Record<string, ParsedNote>> {
  const map: Record<string, ParsedNote> = {};
  for (const dateISO of enumerateDates(fromISO, toISO)) {
    const path = dailyPathForDate(app, dateISO);
    const file = app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) continue;
    const content = await app.vault.read(file);
    if (!noteHasMarker(content, config.questMarker)) continue;
    map[dateISO] = parseNote(content, config.skills);
  }
  return map;
}
