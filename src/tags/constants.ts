export const PRIORITIES = ["must", "should", "could"] as const;
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;

// A tag is NOT a category when it is a priority/difficulty prefix, the optional
// flag, or a tag reserved for later phases (vice / reward/* / target/*).
export function isMetaTag(tagLower: string): boolean {
  return (
    tagLower.startsWith("prio/") ||
    tagLower.startsWith("diff/") ||
    tagLower === "opt" ||
    tagLower === "vice" ||
    tagLower.startsWith("reward/") ||
    tagLower.startsWith("target/")
  );
}
