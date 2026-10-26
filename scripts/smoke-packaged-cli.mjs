import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const temp = await mkdtemp(join(tmpdir(), "lotus-package-smoke-"));
const client = new Client({ name: "packaged-cli-smoke", version: "1.0.0" });
const requestOptions = { timeout: 10_000 };

try {
  // Pack the already-built files, just as the workflow publishes them. Do not
  // run build hooks here: they could hide missing files in the release output.
  const [packed] = JSON.parse(execFileSync("npm", [
    "pack", "--ignore-scripts", "--json", "--pack-destination", temp,
  ], { cwd: root, encoding: "utf8", timeout: 120_000 }));
  assert.equal(packed.name, manifest.name);
  assert.equal(packed.version, manifest.version);
  for (const file of ["cli.js", "dist/bundle.js", "dist/journey.html"]) {
    assert.ok(packed.files.some(entry => entry.path === file), `Missing packaged file: ${file}`);
  }

  const installDir = join(temp, "consumer");
  await mkdir(installDir);
  await writeFile(join(installDir, "package.json"), JSON.stringify({ private: true }));
  execFileSync("npm", [
    "install", "--ignore-scripts", "--omit=dev", "--no-audit", "--no-fund",
    "--package-lock=false", join(temp, packed.filename),
  ], { cwd: installDir, stdio: "inherit", timeout: 120_000 });

  // Invoke npm's actual executable link from outside the checkout. Running
  // `node cli.js` directly would miss the argv[1] bug shipped in 0.8.4.
  await client.connect(new StdioClientTransport({
    command: join(installDir, "node_modules", ".bin", "lotus-wisdom"),
    cwd: installDir,
    stderr: "inherit",
  }), requestOptions);
  assert.equal(client.getServerVersion()?.name, "lotus-wisdom");
  assert.equal(client.getServerVersion()?.version, manifest.version);
  const { tools } = await client.listTools({}, requestOptions);
  assert.deepEqual(tools.map(tool => tool.name).sort(), ["lotuswisdom", "lotuswisdom_summary"]);
  const summary = await client.callTool({
    name: "lotuswisdom_summary", arguments: {},
  }, undefined, requestOptions);
  assert.notEqual(summary.isError, true);
  assert.equal(summary.structuredContent?.journeyLength, 0);
  const call = async (args) => {
    const result = await client.callTool({ name: "lotuswisdom", arguments: args }, undefined, requestOptions);
    assert.notEqual(result.isError, true);
    return result.structuredContent;
  };
  const begin = await call({ tag: "begin", content: "First inquiry", totalSteps: 3 });
  assert.equal(begin.journey, "begin");
  const step = await call({ tag: "open", content: "Explore", stepNumber: 2, previousJourney: begin.journey });
  assert.equal(step.journey, "begin → open");
  const end = await call({ tag: "meditate", content: "Conclude", stepNumber: 3, nextStepNeeded: false, previousJourney: step.journey });
  assert.equal(end.status, "WISDOM_READY");
  assert.equal(end.journey, "begin → open → meditate");
  assert.equal(end.finalJourney, end.journey);
  await call({ tag: "begin", content: "Second inquiry" });
  const restarted = await client.callTool({ name: "lotuswisdom_summary", arguments: {} }, undefined, requestOptions);
  assert.equal(restarted.structuredContent?.journeyLength, 1);
  const resource = await client.readResource({ uri: "ui://lotuswisdom/journey.html" }, requestOptions);
  assert.ok(resource.contents.some(content =>
    content.mimeType === "text/html;profile=mcp-app" && /<html[\s>]/i.test(content.text ?? "")),
  "Packaged journey HTML must be served by the installed CLI");
  console.log(`Packaged CLI smoke passed: ${manifest.name}@${manifest.version}`);
} finally {
  try {
    await client.close();
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
