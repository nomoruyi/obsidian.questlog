import { readFileSync, appendFileSync } from "node:fs";

const FLAG_RE = /\[(patch|minor|major)\]\s*$/;

// commits: array of { message }, ordered oldest -> newest.
// Returns the flag from the most recent commit that carries one, else null.
export function detectBump(commits) {
  let bump = null;
  for (const c of commits ?? []) {
    const m = FLAG_RE.exec(c?.message ?? "");
    if (m) bump = m[1];
  }
  return bump;
}

// CLI: read the push event, emit `bump=<type|empty>` to GITHUB_OUTPUT.
if (import.meta.url === `file://${process.argv[1]}`) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const bump = detectBump(event.commits) ?? "";
  appendFileSync(process.env.GITHUB_OUTPUT, `bump=${bump}\n`);
  console.log(`bump=${bump || "(none)"}`);
}
