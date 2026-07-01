// Detects whether a note carries the opt-in QuestLog marker tag (e.g. "#Quest").
// Only notes with this tag are counted toward score/XP, giving a clean start.

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// True when `content` contains the marker tag. The match follows Obsidian's tag
// rule (preceded by whitespace or line start) and is case-insensitive, with a
// trailing boundary so "#Quest" does not match "#Questing". An empty marker
// disables gating, so every note counts.
export function noteHasMarker(content: string, marker: string): boolean {
  const m = marker.trim().replace(/^#/, "");
  if (!m) return true;
  const re = new RegExp(`(?:^|\\s)#${escapeRegex(m)}(?![\\w/-])`, "i");
  return re.test(content);
}
