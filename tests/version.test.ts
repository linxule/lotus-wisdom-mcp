import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { VERSION } from "../src/shared/version";

// Guards the version single-source-of-truth. src/shared/version.ts is the
// authoritative VERSION; package.json and server.json must agree (kept in sync
// by scripts/sync-version.mjs). A mismatch here means a deploy/publish would
// ship inconsistent versions across npm and the MCP Registry.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const serverManifest = JSON.parse(
  readFileSync(join(root, "server.json"), "utf8"),
);

describe("version single source of truth", () => {
  it("matches package.json version", () => {
    expect(VERSION).toBe(pkg.version);
  });

  it("matches server.json version", () => {
    expect(VERSION).toBe(serverManifest.version);
  });

  it("matches server.json packages[0].version", () => {
    expect(VERSION).toBe(serverManifest.packages[0].version);
  });
});
