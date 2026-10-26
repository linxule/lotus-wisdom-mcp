import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { build } from "vite";

// Run the real app against a DOM, replacing only the host connection.
const builds = await build({
  configFile: false, logLevel: "silent",
  plugins: [{
    name: "test-mcp-host",
    enforce: "pre",
    resolveId(id) { if (id === "@modelcontextprotocol/ext-apps") return "\0test-host"; },
    load(id) {
      if (id === "\0test-host") return `
        export class App {
          constructor() { globalThis.hostApp = this; }
          connect() { return Promise.resolve(); }
          getHostContext() { return {}; }
        }
        export function applyDocumentTheme() {}
        export function applyHostStyleVariables() {}
        export function applyHostFonts() {}
      `;
    },
  }],
  build: {
    write: false, minify: false,
    lib: { entry: fileURLToPath(new URL("../src/mcp-app.ts", import.meta.url)), formats: ["iife"], name: "Journey" },
  },
});
const { output } = Array.isArray(builds) ? builds[0] : builds;
const code = output.find(file => file.type === "chunk").code;
const html = await readFile(new URL("../mcp-app.html", import.meta.url), "utf8");

function host(t) {
  const dom = new JSDOM(html, { runScripts: "outside-only" });
  t.after(() => dom.window.close());
  const { window } = dom;
  Object.defineProperty(window, "parent", { value: {} });
  // Deterministic browser timers exercise animation races without wall-clock waits.
  let now = 0, nextId = 0;
  const timers = new Map();
  window.setTimeout = (callback, delay = 0) => {
    const id = ++nextId;
    timers.set(id, { callback, at: now + delay });
    return id;
  };
  window.clearTimeout = id => timers.delete(id);
  function advance(ms) {
    const end = now + ms;
    for (;;) {
      const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      now = next[1].at;
      timers.delete(next[0]);
      next[1].callback();
    }
    now = end;
  }
  window.eval(code);
  const receive = structuredContent => window.hostApp.ontoolresult({ structuredContent });
  return { window, document: window.document, receive, advance };
}

const begin = { status: "FRAMEWORK_RECEIVED", journey: "begin", totalSteps: 3, contemplation: "New inquiry" };
const end = { status: "WISDOM_READY", finalStep: "meditate", totalSteps: 2, finalJourney: "begin → meditate", contemplation: "Old conclusion" };

function assertFresh(document) {
  assert.equal(document.querySelectorAll("#gn > g").length, 1);
  assert.equal(document.querySelector("#tr").getAttribute("aria-label"), "Journey: begin");
  assert.equal(document.querySelector("#ch").textContent, "begin");
  assert.equal(document.querySelector("#cx").textContent, "New inquiry");
  assert.equal(document.querySelector("#jt").textContent, "");
  assert.equal(document.querySelectorAll("#tr defs").length, 0);
  assert.equal(document.querySelectorAll("#ge > rect").length, 0);
  assert.equal(document.querySelectorAll("#tr text").length, 0);
  assert.ok(document.querySelector("#gn > g").classList.contains("now"));
}

test("new inquiry clears a completed, collapsed and pinned journey in a reused iframe", t => {
  const { window, document, receive, advance } = host(t);
  receive(begin);
  for (let stepNumber = 2; stepNumber <= 10; stepNumber++) {
    receive({ status: "processing", currentStep: "examine", wisdomDomain: "meta_cognitive", stepNumber, totalSteps: 11, contemplation: "Old inquiry" });
  }
  receive({ ...end, totalSteps: 11 });
  advance(2000);
  assert.equal(document.querySelectorAll("#tr defs").length, 1);
  assert.ok(document.querySelector("#tr text").textContent.startsWith("+"));
  document.querySelector("#gn > g").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  receive(begin);
  advance(2000);
  assertFresh(document);
});

test("new inquiry cancels pending completion and text animations", t => {
  const { document, receive, advance } = host(t);
  receive(begin);
  receive({ status: "processing", currentStep: "open", wisdomDomain: "process_flow", stepNumber: 2, totalSteps: 3, contemplation: "Old text ".repeat(100) });
  advance(180); // A typewriter is still active.
  receive(end); // Completion is scheduled but has not run.
  receive(begin);
  advance(2000);
  assertFresh(document);
});

const nodes = document => [...document.querySelectorAll("#gn > g")];

test("a fresh iframe reconstructs the earlier journey from the journey string", t => {
  const { document, receive, advance } = host(t);
  receive({
    status: "processing", currentStep: "examine", wisdomDomain: "meta_cognitive",
    stepNumber: 4, totalSteps: 6, journey: "begin → open → recognize → examine",
    contemplation: "Looking again",
  });
  advance(2000);
  assert.equal(nodes(document).length, 4);
  assert.equal(document.querySelector("#tr").getAttribute("aria-label"), "Journey: begin → open → recognize → examine");
  assert.equal(document.querySelector("#ch").textContent, "examine");
  assert.equal(document.querySelector("#cx").textContent, "Looking again");
  assert.equal(document.querySelectorAll("#gn > g.now").length, 1);
  assert.ok(nodes(document).at(-1).classList.contains("now"));
});

test("a reused iframe appends each step once without re-reconstructing", t => {
  const { document, receive, advance } = host(t);
  receive(begin);
  receive({ status: "processing", currentStep: "open", wisdomDomain: "process_flow", stepNumber: 2, totalSteps: 3, journey: "begin → open", contemplation: "Opening" });
  receive({ status: "processing", currentStep: "examine", wisdomDomain: "meta_cognitive", stepNumber: 3, totalSteps: 3, journey: "begin → open → examine", contemplation: "Examining" });
  advance(2000);
  assert.equal(nodes(document).length, 3);
  assert.equal(document.querySelector("#tr").getAttribute("aria-label"), "Journey: begin → open → examine");
  assert.equal(document.querySelectorAll("#gn > g.now").length, 1);
});

test("meditation completion holds its breath, then yields to the next step", t => {
  const { document, receive, advance } = host(t);
  receive({ status: "MEDITATION_COMPLETE", stepNumber: 3, totalSteps: 5, journey: "begin → open → meditate", contemplation: "Stillness" });
  advance(2000);
  assert.equal(nodes(document).length, 3);
  assert.ok(nodes(document).at(-1).classList.contains("hol"));
  assert.equal(document.querySelector("#ch").textContent, "meditate");
  assert.equal(document.querySelector("#cx").textContent, "Stillness");
  assert.equal(document.querySelector("#jt").textContent, "");

  receive({ status: "processing", currentStep: "integrate", wisdomDomain: "non_dual_recognition", stepNumber: 4, totalSteps: 5, journey: "begin → open → meditate → integrate", contemplation: "What arose" });
  advance(2000);
  assert.equal(nodes(document).length, 4);
  assert.equal(document.querySelectorAll("#gn > g.hol").length, 0);
  assert.ok(nodes(document).at(-1).classList.contains("now"));
  assert.equal(document.querySelector("#ch").textContent, "integrate");
});

test("a meditation step can complete the journey", t => {
  const { document, receive, advance } = host(t);
  receive(end);
  advance(2000);
  assert.equal(nodes(document).length, 2);
  assert.equal(document.querySelector("#tr").getAttribute("aria-label"), "Journey: begin → meditate");
  assert.equal(document.querySelector("#ch").textContent, "meditate");
  assert.equal(document.querySelector("#cx").textContent, "Old conclusion");
  assert.ok(nodes(document).every(node => node.classList.contains("end")));
  assert.ok(document.querySelector("#jt").classList.contains("on"));
  assert.notEqual(document.querySelector("#jt").textContent, "");
});
