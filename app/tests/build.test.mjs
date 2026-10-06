import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { singleFileApp } from "../single-file.ts";

test("builds the journey app into one self-contained HTML resource", async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const { output } = await build({ root, logLevel: "silent", build: { write: false } });
  assert.deepEqual(output.map(file => file.fileName), ["mcp-app.html"]);
  assert.equal(output[0].type, "asset");
  const html = String(output[0].source);
  assert.match(html, /Lotus Wisdom/);
  assert.match(html, /<script\b[^>]*type="module"[^>]*>[\s\S]+<\/script>/);
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc=/i);
  assert.doesNotMatch(html, /<link\b[^>]*\brel=["'](?:stylesheet|modulepreload)["']/i);
  assert.doesNotMatch(html, /__VITE_PRELOAD__/);
});

test("inlines CSS and dynamic imports while preserving literal HTML and dollar signs", async () => {
  const root = await mkdtemp(join(tmpdir(), "lotus-app-build-"));
  const marker = "</ScRiPt><!-- $& $` $'";
  try {
    await writeFile(join(root, "mcp-app.html"), '<html><head></head><body><script type="module" src="./entry.js"></script></body></html>');
    await writeFile(join(root, "entry.js"), "import './style.css'; globalThis.result = import('./lazy.js').then(m => m.value);");
    await writeFile(join(root, "lazy.js"), `export const value = ${JSON.stringify(marker)};`);
    await writeFile(join(root, "style.css"), 'body::before { content: "</style> $&"; color: red; }');
    const { output } = await build({
      root, configFile: false, logLevel: "silent", plugins: [singleFileApp()],
      build: {
        write: false, minify: false, modulePreload: false,
        rolldownOptions: { input: join(root, "mcp-app.html") },
      },
    });
    assert.deepEqual(output.map(file => file.fileName), ["mcp-app.html"]);
    const html = String(output[0].source);
    const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
    assert.equal(scripts.length, 1);
    assert.equal(html.match(/<\/style>/gi)?.length, 1);
    assert.doesNotMatch(html, /__VITE_PRELOAD__/);
    const result = execFileSync(process.execPath, ["--input-type=module"], {
      input: `${scripts[0][1]}\nconsole.log(JSON.stringify(await globalThis.result));`,
      encoding: "utf8", timeout: 10_000,
    });
    assert.equal(JSON.parse(result), marker);
    assert.match(html, /color: red/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
