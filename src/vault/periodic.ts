export type PeriodicKind = "daily" | "weekly" | "monthly";

export interface PeriodicFolders {
  daily: string;
  weekly: string;
  monthly: string;
}

function inFolder(path: string, folder: string): boolean {
  if (!folder) return false;
  const norm = folder.replace(/\/+$/, "");
  return path === `${norm}.md` || path.startsWith(`${norm}/`);
}

export function classifyPeriodic(path: string, folders: PeriodicFolders): PeriodicKind | null {
  if (inFolder(path, folders.daily)) return "daily";
  if (inFolder(path, folders.weekly)) return "weekly";
  if (inFolder(path, folders.monthly)) return "monthly";
  return null;
}
