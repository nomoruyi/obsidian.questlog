import { Priority, Difficulty } from "./types";

export type Grid = Record<Priority, Record<Difficulty, number>>;

export interface QuestLogConfig {
  xpGrid: Grid;
  skills: string[];
  levelBase: number;       // curve constant
  levelExponent: number;   // curve exponent
  rankTitles: string[];    // one per 10 levels (last repeats)
  missionHeading: string;  // lowercase substring marking the missions section
  questMarker: string;     // note-level tag (without '#') a note must carry to count; empty = count all
  skillGlyphs: Record<string, string>;  // skill name (lowercase) -> emoji
  coinGrid: Grid;          // inverted earn grid (same shape as xpGrid)
  rewardsNotePath: string; // vault path to the custom rewards note
  hpEnabled: boolean;        // master toggle for HP/setback/potions
  streakEnabled: boolean;    // master toggle for streak/freeze
  startingMaxHP: number;     // seeds state.maxHP on first run
  defaultRegen: number;      // seeds state.dailyRegen on first run
  undonePenalty: Record<Priority, number>; // HP lost per undone task by priority
  viceLoss: Record<Difficulty, number>;    // HP lost per vice unit by difficulty (inverted)
  setbackMode: "level-floor" | "lose-percent" | "off";
  setbackPercent: number;    // used only when setbackMode === "lose-percent" (0..100)
  potionPrices: { minor: number; normal: number; major: number };
  maxHpUpgradePrice: number;
  maxHpUpgradeAmount: number;
  regenUpgradePrice: number;
  regenUpgradeAmount: number;
  freezePrice: number;     // built-in freeze price
  finalizeDayReward: number; // flat coins granted per processed day at finalize; 0 = off
  confettiEnabled: boolean; // master toggle for level-up confetti
  sfxEnabled: boolean;      // master toggle for level-up sound
  missionRolloverEnabled: boolean; // copy unfinished missions into today at finalize
}

export const DEFAULT_CONFIG: QuestLogConfig = {
  xpGrid: {
    must:   { easy: 50, medium: 70, hard: 100 },
    should: { easy: 20, medium: 30, hard: 45 },
    could:  { easy: 10, medium: 15, hard: 20 },
  },
  skills: ["mind", "body", "home", "social", "digital", "general"],
  levelBase: 1000,   // XP for the first level-up (L1->L2); ~ one full day of the daily template
  levelExponent: 1.5,
  rankTitles: ["Heimin", "Ashigaru", "Samurai", "Gokenin", "Hatamoto", "Karō", "Daimyō", "Shōgun", "Kampaku", "Tennō", "Kami"],
  missionHeading: "mission",
  questMarker: "Quest",
  skillGlyphs: { mind: "🧠", body: "💪", home: "🏠", social: "🗣️", digital: "💻", general: "🎯" },
  coinGrid: {
    must:   { easy: 1, medium: 2, hard: 3 },
    should: { easy: 2, medium: 4, hard: 6 },
    could:  { easy: 3, medium: 6, hard: 9 },
  },
  rewardsNotePath: "_questlog/ql_Rewards.md",
  hpEnabled: true,
  streakEnabled: true,
  startingMaxHP: 100,
  defaultRegen: 10,
  undonePenalty: { must: 10, should: 5, could: 0 },
  viceLoss: { hard: 5, medium: 10, easy: 20 },
  setbackMode: "level-floor",
  setbackPercent: 50,
  potionPrices: { minor: 50, normal: 100, major: 150 },
  maxHpUpgradePrice: 300,
  maxHpUpgradeAmount: 10,
  regenUpgradePrice: 5000,
  regenUpgradeAmount: 2,
  freezePrice: 50,
  finalizeDayReward: 20,
  confettiEnabled: true,
  sfxEnabled: true,
  missionRolloverEnabled: true,
};

const FALLBACK_GLYPH = "🏷️";

// "mind=🧠, body=💪, plain" -> { skills:["mind","body","plain"],
//                               glyphs:{ mind:"🧠", body:"💪", plain:"🏷️" } }
export function parseSkillsField(raw: string): { skills: string[]; glyphs: Record<string, string> } {
  const skills: string[] = [];
  const glyphs: Record<string, string> = {};
  for (const token of raw.split(",")) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    const name = (eq === -1 ? trimmed : trimmed.slice(0, eq)).trim().toLowerCase();
    if (!name) continue;
    const emoji = (eq === -1 ? "" : trimmed.slice(eq + 1)).trim() || FALLBACK_GLYPH;
    if (!skills.includes(name)) skills.push(name);
    glyphs[name] = emoji; // last occurrence wins
  }
  return { skills, glyphs };
}

// inverse of parseSkillsField, in `skills` order; 🏷️ for any name missing from `glyphs`.
export function formatSkillsField(skills: string[], glyphs: Record<string, string>): string {
  return skills.map((s) => `${s}=${glyphs[s] ?? FALLBACK_GLYPH}`).join(", ");
}
