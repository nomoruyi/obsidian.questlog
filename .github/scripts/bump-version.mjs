import { readFileSync, writeFileSync, appendFileSync } from "node:fs";

// Pure semver increment. current "x.y.z", type patch|minor|major.
export function nextVersion(current, type) {
  const [x, y, z] = current.split(".").map(Number);
  if ([x, y, z].some(Number.isNaN)) throw new Error(`bad version: ${current}`);
  switch (type) {
    case "major": return `${x + 1}.0.0`;
    case "minor": return `${x}.${y + 1}.0`;
    case "patch": return `${x}.${y}.${z + 1}`;
    default: throw new Error(`unknown bump type: ${type}`);
  }
}

function readJSON(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}
function writeJSON(p, obj) {
  writeFileSync(p, JSON.stringify(obj, null, 2) + "\n"); // standardize to 2-space + newline
}

// CLI: node bump-version.mjs <patch|minor|major>
// manifest.json is the source of truth. Writes manifest.json, versions.json, package.json.
if (import.meta.url === `file://${process.argv[1]}`) {
  const type = process.argv[2];

  const manifest = readJSON("manifest.json");
  const version = nextVersion(manifest.version, type);
  manifest.version = version;
  writeJSON("manifest.json", manifest);

  const versions = readJSON("versions.json");
  versions[version] = manifest.minAppVersion;
  writeJSON("versions.json", versions);

  const pkg = readJSON("package.json");
  pkg.version = version;
  writeJSON("package.json", pkg);

  appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
  console.log(version);
}
