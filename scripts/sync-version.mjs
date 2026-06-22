#!/usr/bin/env node
// Single source of truth for the version is src/shared/version.ts.
// This script propagates it to package.json and server.json so the version
// never has to be hand-edited in multiple places (which previously drifted).
//
// Usage: bump VERSION in src/shared/version.ts, then `bun run sync-version`.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const versionTs = readFileSync(join(root, "src/shared/version.ts"), "utf8");
const match = versionTs.match(/VERSION\s*=\s*["']([^"']+)["']/);
if (!match) {
  console.error("Could not find VERSION in src/shared/version.ts");
  process.exit(1);
}
const version = match[1];

function patchJson(rel, fn) {
  const path = join(root, rel);
  const json = JSON.parse(readFileSync(path, "utf8"));
  fn(json);
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log(`  synced ${rel} -> ${version}`);
}

patchJson("package.json", (j) => {
  j.version = version;
});
patchJson("server.json", (j) => {
  j.version = version;
  if (Array.isArray(j.packages) && j.packages[0]) {
    j.packages[0].version = version;
  }
});

console.log(`Version ${version} synced from src/shared/version.ts.`);
