import { expect, it } from "vitest";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { VERSION } from "../src/shared/version";

it.each(["cli.js", "lotus-wisdom", "bundle.js"])("starts the packaged CLI through %s", async (name) => {
  const dir = await mkdtemp(join(tmpdir(), "lotus-cli-test-"));
  const entry = join(dir, name);
  const client = new Client({ name: "cli-regression", version: "1.0.0" });
  try {
    // npm exposes cli.js through a .bin/lotus-wisdom symlink. Node preserves
    // that symlink name in argv[1], so testing cli.js alone misses the failure.
    const source = name === "bundle.js" ? "../dist/bundle.js" : "../cli.js";
    await symlink(fileURLToPath(new URL(source, import.meta.url)), entry);
    await client.connect(new StdioClientTransport({
      command: process.execPath,
      args: [entry],
      cwd: dir,
      stderr: "pipe",
    }));
    expect(client.getServerVersion()?.version).toBe(VERSION);
    expect((await client.listTools()).tools.map(tool => tool.name).sort()).toEqual([
      "lotuswisdom", "lotuswisdom_summary",
    ]);
    const summary = await client.callTool({ name: "lotuswisdom_summary", arguments: {} });
    expect(summary.isError).not.toBe(true);
    expect(summary.structuredContent?.journeyLength).toBe(0);
  } finally {
    await client.close();
    await rm(dir, { recursive: true, force: true });
  }
});
