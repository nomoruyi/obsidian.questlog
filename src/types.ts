export type Priority = "must" | "should" | "could";
export type Difficulty = "easy" | "medium" | "hard";

export interface ParsedTask {
  text: string;          // task text with tags stripped
  done: boolean;         // effective completion (rolled up if it has children)
  priority: Priority;
  difficulty: Difficulty;
  category: string;      // skill key; "general" if untagged
  optional: boolean;     // had #opt
  section: string;       // lowercased nearest heading text ("" if none)
  children: ParsedTask[];
}

export interface ParsedVice {
  label: string;          // e.g. "Cigarettes"
  count: number;          // N
  difficulty: Difficulty;
}

export interface ParsedNote {
  tasks: ParsedTask[];   // top-level tasks only
  vices: ParsedVice[];   // non-checkbox "- label: N #vice" lines
}

export interface Score {
  done: number;
  total: number;
}
