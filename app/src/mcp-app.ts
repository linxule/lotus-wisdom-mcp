import {
  App,
  applyDocumentTheme,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import { EM, GLYPHS } from "./glyphs.ts";

// --- Geometry (halo viewBox 0 0 120 120) ---
const NS = "http://www.w3.org/2000/svg";
const C = 60;
// An over-eager totalSteps estimate never draws more unlit slots than a mala has beads.
const MALA = 108;
// The ring is a grid of square pixels: cells of CELL units whose centres fall
// between RIN and ROUT. Each cell knows its angle (0 at top, clockwise), its
// 4x4 Bayer quartile, which draws the ░▒▓█ ramp, and a mosaic index that
// colours meditation with all five aura colours.
const CELL = 4, PX = 3.4, RIN = 39, ROUT = 51.5;
const HIT = 45, FOCUS = 54, PIN = 34;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
interface Cell { x: string; y: string; a: number; q: number; k: number }
const CELLS: Cell[] = [];
for (let j = 0; j < 120 / CELL; j++) {
  for (let i = 0; i < 120 / CELL; i++) {
    const dx = (i + 0.5) * CELL - C, dy = (j + 0.5) * CELL - C;
    const r = Math.hypot(dx, dy);
    if (r < RIN || r > ROUT) continue;
    CELLS.push({
      x: (i * CELL + (CELL - PX) / 2).toFixed(2),
      y: (j * CELL + (CELL - PX) / 2).toFixed(2),
      a: ((Math.atan2(dy, dx) * 180) / Math.PI + 450) % 360,
      q: BAYER[(j % 4) * 4 + (i % 4)]! >> 2,
      k: (i + j) % 5,
    });
  }
}

const DOMAIN: Record<string, { key: string; label: string }> = {
  entry: { key: "entry", label: "Entry" },
  process_flow: { key: "process", label: "Process" },
  skillful_means: { key: "skill", label: "Skillful Means" },
  non_dual_recognition: { key: "nondual", label: "Non-Dual" },
  meta_cognitive: { key: "meta", label: "Meta-Cognitive" },
  meditation: { key: "med", label: "Meditation" },
};
const TAG_DOM: Record<string, string> = {
  begin: "entry",
  open: "process_flow", engage: "process_flow", express: "process_flow",
  upaya: "skillful_means", expedient: "skillful_means", direct: "skillful_means",
  gradual: "skillful_means", sudden: "skillful_means",
  recognize: "non_dual_recognition", transform: "non_dual_recognition",
  integrate: "non_dual_recognition", transcend: "non_dual_recognition", embody: "non_dual_recognition",
  examine: "meta_cognitive", reflect: "meta_cognitive", verify: "meta_cognitive",
  refine: "meta_cognitive", complete: "meta_cognitive",
  meditate: "meditation",
};

// Each tag's character (traditional form), its pinyin, and where it comes
// from. Every one traces to Kumārajīva's Lotus Sutra (T262) or to Tiantai's
// reading of it (T1931); chapters checked against the CBETA text. open,
// express, recognize and embody spell 開示悟入, the four aims of the Buddha's
// appearance in ch. 2; examine and meditate make Tiantai's 止觀.
type Glyph = readonly [char: string, reading: string, gloss: string];
const GLYPH: Record<string, Glyph> = {
  begin: ["發", "fā", "arousing the mind of awakening (發菩提心, ch. 17)"],
  open: ["開", "kāi", "opening the Buddha's knowledge (ch. 2)"],
  engage: ["行", "xíng", "practice, the bodhisattva way (行菩薩道, ch. 10)"],
  express: ["示", "shì", "showing the Buddha's knowledge (ch. 2)"],
  upaya: ["巧", "qiǎo", "skillful means (巧說諸法, ch. 2)"],
  expedient: ["權", "quán", "the provisional (開權顯實, Tiantai)"],
  direct: ["直", "zhí", "directly, setting means aside (正直捨方便, ch. 2)"],
  gradual: ["漸", "jiàn", "the gradual teaching (Tiantai)"],
  sudden: ["頓", "dùn", "the sudden teaching (Tiantai)"],
  recognize: ["悟", "wù", "awakening to the Buddha's knowledge (ch. 2)"],
  transform: ["轉", "zhuǎn", "turning the Dharma wheel (轉法輪)"],
  integrate: ["融", "róng", "perfect interfusion (圓融, Tiantai)"],
  transcend: ["出", "chū", "going out of the burning house (ch. 3)"],
  embody: ["入", "rù", "entering the Buddha's knowledge (ch. 2)"],
  examine: ["觀", "guān", "contemplation (止觀, Tiantai)"],
  reflect: ["照", "zhào", "illumination across eighteen thousand worlds (ch. 1)"],
  verify: ["證", "zhèng", "bearing witness (為作證明, ch. 11)"],
  refine: ["淨", "jìng", "purifying the six senses (ch. 19)"],
  complete: ["圓", "yuán", "the perfect teaching (圓教, Tiantai)"],
  meditate: ["止", "zhǐ", "stopping (止觀, Tiantai)"],
};
const LOTUS: Glyph = ["蓮", "lián", "lotus (妙法蓮華經)"];
const UNKNOWN: Glyph = ["空", "kōng", "emptiness"];

const ARROW: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

// --- State ---
interface Step { tag: string; dom: string; sn: number; med: boolean; text: string }
const steps: Step[] = [];
let total = 0;
let done = false;
let displayIdx = -1;
let pinnedIdx = -1;
let contentTimer: ReturnType<typeof setTimeout> | null = null;
let finishTimer: ReturnType<typeof setTimeout> | null = null;
let pendingContent = "";

// --- Lookups ---
function dkey(dom: string): string { return DOMAIN[dom]?.key ?? "entry"; }
function label(dom: string): string { return DOMAIN[dom]?.label ?? dom; }
function tagDom(tag: string): string { return TAG_DOM[tag] ?? "entry"; }
function glyph(tag: string): Glyph { return GLYPH[tag] ?? UNKNOWN; }

// --- DOM helpers ---
function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el;
}
function sv(tag: string, a?: Record<string, string | number | undefined>): SVGElement {
  const e = document.createElementNS(NS, tag) as SVGElement;
  if (a) for (const k in a) { const v = a[k]; if (v != null) e.setAttribute(k, String(v)); }
  return e;
}
// Characters render from embedded outlines; system CJK fonts vary or are absent.
function inked(text: string): SVGElement {
  const svg = sv("svg", { "aria-hidden": "true", focusable: "false" });
  let x = 0;
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (!g) continue;
    svg.appendChild(sv("path", { d: g[1], transform: x ? `translate(${x} 0)` : undefined }));
    x += g[0];
  }
  svg.setAttribute("viewBox", `0 0 ${x || EM} ${EM}`);
  return svg;
}

function stepNodes(): SVGElement[] { return [...$("gn").children] as SVGElement[]; }

function clearTimers(): void {
  for (const t of [contentTimer, finishTimer]) if (t !== null) clearTimeout(t);
  contentTimer = finishTimer = null;
}

function tint(dom: string): void {
  $("root").style.setProperty("--c", `var(--d-${dkey(dom)})`);
}

function setGlyph(g: Glyph, cls: string): void {
  const gk = $("gk");
  gk.replaceChildren(inked(g[0]));
  gk.title = `${g[0]} ${g[1]} · ${g[2]}`;
  gk.className = cls;
}

function resetJourney(): void {
  clearTimers();
  steps.length = 0;
  total = 0;
  done = false;
  $("root").classList.remove("done");
  displayIdx = pinnedIdx = -1;
  for (const id of ["gs", "gn"]) $(id).replaceChildren();
  $("tr").setAttribute("aria-label", "Contemplative journey");
  for (const id of ["ch", "cx"]) $(id).textContent = "";
  $("cx").className = "";
  $("ct").classList.remove("on");
  $("ci").style.opacity = "0";
  setGlyph(LOTUS, "idle");
  tint("entry");
}

// --- Ring geometry ---
function ringSize(): number {
  if (done) return Math.max(steps.length, 1);
  return Math.max(steps.length, Math.min(total, MALA), 1);
}

function polar(deg: number, r: number): [number, number] {
  const t = (deg * Math.PI) / 180;
  return [C + r * Math.cos(t), C + r * Math.sin(t)];
}

// Gaps must clear about one pixel column, so they cannot shrink with the segment.
function gapOf(n: number): number {
  const seg = 360 / n;
  if (n === 1) return 0;
  return seg >= 14 ? Math.min(9, Math.max(4.5, seg * 0.22)) : seg * 0.3;
}

function span(i: number, n: number): [number, number] {
  const seg = 360 / n, gap = Math.max(gapOf(n), 0.5);
  const a0 = -90 + i * seg + gap / 2;
  return [a0, a0 + seg - gap];
}

function segmentOf(a: number, n: number): number {
  const seg = 360 / n, gap = gapOf(n);
  const i = Math.min(n - 1, Math.floor(a / seg));
  const off = a - i * seg;
  return off < gap / 2 || off > seg - gap / 2 ? -1 : i;
}

function pixels(parent: SVGElement, cells: Cell[], med: boolean): SVGElement {
  for (const c of cells) {
    parent.appendChild(sv("rect", { x: c.x, y: c.y, width: PX, height: PX, class: med ? `q${c.q} k${c.k}` : `q${c.q}` }));
  }
  return parent;
}

function arc(i: number, n: number, r: number): string {
  const [a0, a1] = span(i, n);
  const [x0, y0] = polar(a0, r), [x1, y1] = polar(a1, r);
  const f = (v: number) => v.toFixed(2);
  return `M${f(x0)} ${f(y0)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${f(x1)} ${f(y1)}`;
}

// Redraw for the current ring size: unlit slots for steps still to come, and
// every lit segment moved to its place. The circle closes on completion.
function layout(): void {
  const n = ringSize();
  const buckets: Cell[][] = Array.from({ length: n }, () => []);
  for (const c of CELLS) {
    const s = segmentOf(c.a, n);
    if (s >= 0) buckets[s]!.push(c);
  }
  const gs = $("gs");
  gs.replaceChildren();
  for (let i = steps.length; i < n; i++) gs.appendChild(pixels(sv("g", { class: "slot" }), buckets[i]!, false));
  stepNodes().forEach((node, i) => {
    const px = node.querySelector(".px") as SVGElement;
    px.replaceChildren();
    pixels(px, buckets[i] ?? [], steps[i]!.med);
    node.querySelectorAll("[data-r]").forEach(p => p.setAttribute("d", arc(i, n, +(p.getAttribute("data-r") ?? HIT))));
    const [a0, a1] = span(i, n);
    const [x, y] = polar((a0 + a1) / 2, PIN);
    const pm = node.querySelector(".pm");
    pm?.setAttribute("x", (x - PX / 2).toFixed(2));
    pm?.setAttribute("y", (y - PX / 2).toFixed(2));
  });
}

function makeNode(i: number, s: Step): SVGElement {
  const g = sv("g", {
    class: `sn d-${dkey(s.dom)}`,
    tabindex: 0,
    role: "button",
    "aria-pressed": "false",
    "aria-label": `Step ${s.sn}: ${s.tag} (${label(s.dom)})`,
  });
  g.dataset.i = String(i);
  g.appendChild(sv("path", { class: "fr", "data-r": FOCUS }));
  g.appendChild(sv("g", { class: "px" }));
  g.appendChild(sv("rect", { class: "pm", width: PX, height: PX }));
  g.appendChild(sv("path", { class: "hit", "data-r": HIT }));

  const idx = () => +(g.dataset.i ?? "0");
  const preview = () => showContent(idx());
  const restore = () => showContent(pinnedIdx >= 0 ? pinnedIdx : steps.length - 1);
  const activate = (e: Event) => { e.stopPropagation(); togglePin(idx()); };

  g.addEventListener("mouseenter", preview);
  g.addEventListener("mouseleave", restore);
  g.addEventListener("click", activate);
  // Keyboard: focus mirrors hover, Enter/Space mirror click, arrows walk the ring.
  g.addEventListener("focus", preview);
  g.addEventListener("blur", restore);
  g.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      activate(e);
      return;
    }
    const nodes = stepNodes();
    const step = ARROW[e.key];
    let to = step === undefined ? -1 : (idx() + step + nodes.length) % nodes.length;
    if (e.key === "Home") to = 0;
    if (e.key === "End") to = nodes.length - 1;
    if (to >= 0) { e.preventDefault(); nodes[to]?.focus(); }
  });
  return g;
}

function addStep(data: { tag: string; dom: string; sn: number; status: string; text: string }, anim = true): void {
  const { tag, dom } = data;
  const med = tag === "meditate";

  for (const prev of $("gn").querySelectorAll(".now, .hol")) {
    prev.classList.remove("now", "hol");
    prev.classList.add("past");
  }

  const s: Step = { tag, dom, sn: data.sn, med, text: data.text || "" };
  steps.push(s);
  const i = steps.length - 1;
  const node = makeNode(i, s);
  node.classList.add(anim ? (med ? "hol" : "now") : "past");
  $("gn").appendChild(node);
  layout();

  $("tr").setAttribute("aria-label", "Journey: " + steps.map(st => st.tag).join(" → "));
  setPin(-1);
  if (anim) showContent(i);
  $("ct").classList.add("on");

  if (data.status === "WISDOM_READY") {
    done = true;
    if (finishTimer !== null) clearTimeout(finishTimer);
    finishTimer = setTimeout(() => { finishTimer = null; finish(); }, 600);
  }
}

// --- Content panel ---
function showContent(i: number): void {
  if (i < 0 || i >= steps.length) return;
  if (contentTimer !== null) { clearTimeout(contentTimer); contentTimer = null; }
  const s = steps[i]!;
  tint(s.dom);
  if (i === displayIdx) return;

  const ci = $("ci");
  ci.style.opacity = "0";

  contentTimer = setTimeout(() => {
    contentTimer = null;
    $("ch").textContent = s.tag;
    setGlyph(glyph(s.tag), "");
    const cx = $("cx");
    cx.className = s.med ? "med-text" : "";
    cx.textContent = s.text;
    ci.style.opacity = "1";
    displayIdx = i;
  }, 160);
}

function setPin(i: number): void {
  pinnedIdx = i;
  for (const node of stepNodes()) {
    const on = node.dataset.i === String(i);
    node.classList.toggle("pin", on);
    node.setAttribute("aria-pressed", String(on));
  }
}

function togglePin(i: number): void {
  if (pinnedIdx === i) { setPin(-1); showContent(steps.length - 1); }
  else { setPin(i); showContent(i); }
}

function finish(): void {
  setPin(-1);
  const nodes = stepNodes();
  nodes.forEach((node, k) => {
    node.classList.remove("now", "hol", "past");
    node.classList.add("end");
    node.style.setProperty("--k", `${((k * 1.1) / Math.max(nodes.length, 1)).toFixed(3)}s`);
  });
  // The circle closes and turns white, segment by segment. That is the whole
  // ending; pointing at a segment still shows its colour.
  layout();
  $("root").classList.add("done");
}

// --- Reconstruct the earlier journey in a fresh iframe ---
function reconstructFromJourney(journeyStr: string | undefined): void {
  if (!journeyStr || steps.length > 0) return;
  const tags = journeyStr.split(" → ");
  for (let i = 0; i < tags.length - 1; i++) {
    const tag = tags[i]!.trim();
    addStep({ tag, dom: tagDom(tag), sn: i + 1, status: "processing", text: "" }, false);
  }
}

// --- Parse tool result from any format ---
function parseToolResult(result: Record<string, unknown>): Record<string, unknown> | null {
  if (result.structuredContent && typeof result.structuredContent === "object") {
    const sc = result.structuredContent as Record<string, unknown>;
    if (sc.status) return sc;
  }
  const content = result.content;
  if (Array.isArray(content)) {
    for (const c of content) {
      if (c && typeof c === "object" && (c as Record<string, unknown>).type === "text") {
        try { return JSON.parse((c as Record<string, unknown>).text as string); } catch { /* skip */ }
      }
    }
  }
  return null;
}

function receive(r: Record<string, unknown>): void {
  if (!r || !r.status) return;
  const txt = pendingContent || (r.contemplation as string) || "";
  pendingContent = "";
  const status = r.status as string;
  const st = (r.totalSteps as number) || (r.stepNumber as number) || 8;

  if (status === "FRAMEWORK_RECEIVED") {
    resetJourney();
    total = st;
    addStep({ tag: "begin", dom: "entry", sn: 1, status, text: txt });
  } else if (status === "MEDITATION_COMPLETE") {
    total = st;
    reconstructFromJourney(r.journey as string);
    addStep({ tag: "meditate", dom: "meditation", sn: r.stepNumber as number, status, text: txt });
  } else if (status === "WISDOM_READY") {
    total = st;
    reconstructFromJourney(r.finalJourney as string);
    const t = (r.finalStep as string) || "complete";
    addStep({ tag: t, dom: tagDom(t), sn: st, status, text: txt });
  } else if (status === "processing") {
    total = st;
    reconstructFromJourney(r.journey as string);
    const tag = r.currentStep as string;
    addStep({ tag, dom: (r.wisdomDomain as string) || tagDom(tag), sn: r.stepNumber as number, status, text: txt });
  }
}

document.addEventListener("click", () => {
  if (pinnedIdx >= 0) { setPin(-1); showContent(steps.length - 1); }
});

setGlyph(LOTUS, "idle");

// --- ext-apps SDK connection ---
const app = new App({ name: "Lotus Wisdom Journey", version: "1.0.0" });

// The panel keeps its own palette; the host only chooses night or day.
function applyHostContext(ctx: Partial<McpUiHostContext> | undefined): void {
  if (!ctx) return;
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.safeAreaInsets) {
    const { top, right, bottom, left } = ctx.safeAreaInsets;
    const root = $("root");
    root.style.paddingTop = `${16 + top}px`;
    root.style.paddingRight = `${18 + right}px`;
    root.style.paddingBottom = `${16 + bottom}px`;
    root.style.paddingLeft = `${18 + left}px`;
  }
}

app.ontoolinput = (params: Record<string, unknown>) => {
  const args = params.arguments as Record<string, unknown> | undefined;
  if (args?.content) pendingContent = args.content as string;
};

app.ontoolresult = (result: Record<string, unknown>) => {
  const parsed = parseToolResult(result);
  if (parsed) receive(parsed);
};

app.onhostcontextchanged = (params) => applyHostContext(params);

app.onerror = (err: Error) => console.error("Lotus Wisdom ext-apps error:", err);

// --- Startup: connect, or preview standalone ---
// ?frame=N previews the panel a host shows for step N alone, even inside an
// iframe, so a page of N iframes can stand in for a conversation.
const params = new URLSearchParams(location.search);
const frame = Number(params.get("frame")) || 0;

if (window !== window.parent && !frame) {
  app.connect().then(() => {
    console.info("Lotus Wisdom: ext-apps connected");
    applyHostContext(app.getHostContext());
  }).catch((err: Error) => {
    console.error("Lotus Wisdom: ext-apps connection failed:", err);
  });
} else {
  // Standalone preview: ?theme=light for the daylight variant, ?demo=off to
  // drive it by hand through window.lotus.receive(structuredContent).
  const theme = params.get("theme");
  if (theme === "light" || theme === "dark") applyDocumentTheme(theme);
  (window as unknown as { lotus: unknown }).lotus = { receive };
  if (params.get("demo") !== "off") {
    // The demo replays the Lotus Wisdom journey that decided this design.
    const steps7 = ["begin", "open", "examine", "meditate", "recognize", "upaya", "express"];
    const J = (n: number) => steps7.slice(0, n).join(" \u2192 ");
    const seq: Array<Record<string, unknown> & { _d: number }> = [
      { status: "FRAMEWORK_RECEIVED", totalSteps: 7, journey: J(1), contemplation: "What should the journey UI let go of, in text, color and effect, and what must it keep so it does not slide back into the generic look we started by leaving?", _d: 2600 },
      { status: "processing", currentStep: "open", wisdomDomain: "process_flow", stepNumber: 2, totalSteps: 7, journey: J(2), contemplation: "Count what is on screen: some twenty-five things for one small panel. Brand, status, counter, domain, a reading, a trail; six hues in six places; two glows, a flicker, a hum, a chase, a bloom, a dot grid, a decode.", _d: 3200 },
      { status: "processing", currentStep: "examine", wisdomDomain: "meta_cognitive", stepNumber: 3, totalSteps: 7, journey: J(3), contemplation: "Ask each what it tells a reader that nothing else does. Only three carry something unique: the ring (where am I), the character and tag (what is this step), the words (what was thought). Everything else is an echo.", _d: 3200 },
      { status: "MEDITATION_COMPLETE", stepNumber: 4, totalSteps: 7, journey: J(4), contemplation: "Sitting with the worry: strip this far and it looks like the cream trace we left.", _d: 4400 },
      { status: "processing", currentStep: "recognize", wisdomDomain: "non_dual_recognition", stepNumber: 5, totalSteps: 7, journey: J(5), contemplation: "The old trace was not generic because it was sparse. It was generic because its forms were borrowed. The glows and flicker are borrowed too. Let the cyber live in the medium (pixels, mono, dither), not in the effects.", _d: 3400 },
      { status: "processing", currentStep: "upaya", wisdomDomain: "skillful_means", stepNumber: 6, totalSteps: 7, journey: J(6), contemplation: "Color is attention: only the step you are on is in color, and the full palette is earned when the circle closes. One motion per event. Text is the tag and the words.", _d: 3400 },
      { status: "WISDOM_READY", totalSteps: 7, finalStep: "express", finalJourney: J(7), contemplation: "Keep the ring, the character, the words and the sutra line. Reduce until only the specific remains.", _d: 2000 },
    ];
    if (frame) {
      const step = seq[frame - 1];
      if (step) receive(step);
      // Stand in for the host's auto-resize so preview.html can size each frame.
      const report = () => window.parent.postMessage(
        { lotusFrame: frame, height: Math.ceil(document.documentElement.getBoundingClientRect().height) }, "*");
      if (window.parent !== window) new ResizeObserver(report).observe(document.body);
    }
    let t = 900;
    for (const s of frame ? [] : seq) {
      const delay = t;
      setTimeout(() => receive(s), delay);
      t += s._d;
    }
  }
}
