import {
  App,
  applyDocumentTheme,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import { EM, GLYPHS } from "./glyphs.ts";

// --- Geometry (halo viewBox 0 0 120 120) ---
const NS = "http://www.w3.org/2000/svg";
const C = 60;
const RING = 44;
const INNER = 36;
// An over-eager totalSteps estimate never draws more unlit slots than a mala has beads.
const MALA = 108;
// Meditation is the flag's sixth band: blue, yellow, red, white, orange, inner to outer.
const BANDS = [41.8, 42.9, 44, 45.1, 46.2];

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

// Each tag's character, its reading in Japanese Buddhism, and a gloss.
// open, express, recognize and embody spell 開示悟入, the four aims of the
// Buddha's appearance in Lotus Sutra ch. 2; examine and meditate make 止観,
// the practice of Tiantai, the Lotus Sutra school.
type Glyph = readonly [char: string, reading: string, gloss: string];
const GLYPH: Record<string, Glyph> = {
  begin: ["発", "hotsu", "arousing the mind (発心)"],
  open: ["開", "kai", "opening"],
  engage: ["行", "gyō", "practice"],
  express: ["示", "ji", "showing"],
  upaya: ["方便", "hōben", "skillful means"],
  expedient: ["権", "gon", "the provisional"],
  direct: ["直", "jiki", "direct pointing (直指)"],
  gradual: ["漸", "zen", "the gradual (漸悟)"],
  sudden: ["頓", "ton", "the sudden (頓悟)"],
  recognize: ["悟", "go", "awakening"],
  transform: ["転", "ten", "turning (転依)"],
  integrate: ["融", "yū", "interfusion (円融)"],
  transcend: ["超", "chō", "going beyond"],
  embody: ["入", "nyū", "entering"],
  examine: ["観", "kan", "contemplation (止観)"],
  reflect: ["照", "shō", "illumination (照見)"],
  verify: ["証", "shō", "realization"],
  refine: ["磨", "ma", "polishing"],
  complete: ["円", "en", "the round, the complete"],
  meditate: ["止", "shi", "stopping (止観)"],
};
const LOTUS: Glyph = ["蓮", "ren", "lotus"];
const UNKNOWN: Glyph = ["空", "kū", "emptiness"];

const ARROW: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

const STATUS: Record<string, string> = {
  FRAMEWORK_RECEIVED: "opening",
  processing: "contemplating",
  MEDITATION_COMPLETE: "stillness",
  WISDOM_READY: "wisdom ready",
};

// The decode's noise: the Heart Sutra's "form is emptiness, emptiness is form".
const NOISE = [..."rūpaṃśūnyatāśūnyataivarūpaṃ"];

// --- State ---
interface Step { tag: string; dom: string; sn: number; med: boolean; text: string }
const steps: Step[] = [];
let total = 0;
let done = false;
let displayIdx = -1;
let pinnedIdx = -1;
let revealedIdx = -1;
let contentTimer: ReturnType<typeof setTimeout> | null = null;
let decodeTimer: ReturnType<typeof setTimeout> | null = null;
let finishTimer: ReturnType<typeof setTimeout> | null = null;
let pendingContent = "";

const calm = typeof window.matchMedia === "function"
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// --- Lookups ---
function dkey(dom: string): string { return DOMAIN[dom]?.key ?? "entry"; }
function label(dom: string): string { return DOMAIN[dom]?.label ?? dom; }
function tagDom(tag: string): string { return TAG_DOM[tag] ?? "entry"; }
function glyph(tag: string): Glyph { return GLYPH[tag] ?? UNKNOWN; }
function pad(n: number): string { return String(n).padStart(2, "0"); }

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
  for (const t of [contentTimer, decodeTimer, finishTimer]) if (t !== null) clearTimeout(t);
  contentTimer = decodeTimer = finishTimer = null;
}

function setStatus(status: string): void {
  $("hs").textContent = STATUS[status] ?? "standby";
  const root = $("root");
  root.classList.toggle("live", status === "processing" || status === "FRAMEWORK_RECEIVED");
  root.classList.toggle("still", status === "MEDITATION_COMPLETE");
  root.classList.toggle("done", status === "WISDOM_READY");
}

function tint(dom: string): void {
  $("root").style.setProperty("--c", `var(--d-${dkey(dom)})`);
}

function setGlyph(g: Glyph, cls: string): void {
  const gk = $("gk");
  gk.replaceChildren(inked(g[0]));
  gk.title = `${g[0]} ${g[1]} · ${g[2]}`;
  gk.className = [cls, [...g[0]].length > 1 ? "duo" : ""].filter(Boolean).join(" ");
  $("gr").textContent = g[1];
}

function resetJourney(): void {
  clearTimers();
  steps.length = 0;
  total = 0;
  done = false;
  displayIdx = pinnedIdx = revealedIdx = -1;
  for (const id of ["gg", "gs", "gn", "ge"]) $(id).replaceChildren();
  $("tr").querySelectorAll("defs").forEach(node => node.remove());
  $("tr").setAttribute("aria-label", "Contemplative journey");
  $("jt").replaceChildren();
  $("jt").classList.remove("on");
  for (const id of ["ch", "cd", "cn", "cx"]) $(id).textContent = "";
  $("cx").className = "";
  $("cx").removeAttribute("aria-busy");
  $("ct").classList.remove("on");
  $("ci").style.opacity = "0";
  setGlyph(LOTUS, "idle");
  tint("entry");
  setStatus("");
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

function span(i: number, n: number): [number, number] {
  const seg = 360 / n;
  const gap = n === 1 ? 2 : Math.min(7, Math.max(1.2, seg * 0.16));
  const a0 = -90 + i * seg + gap / 2;
  return [a0, a0 + seg - gap];
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
  const gs = $("gs");
  gs.replaceChildren();
  for (let i = steps.length; i < n; i++) gs.appendChild(sv("path", { class: "slot", d: arc(i, n, RING) }));
  stepNodes().forEach((node, i) => {
    node.querySelectorAll("[data-r]").forEach(p => p.setAttribute("d", arc(i, n, +(p.getAttribute("data-r") ?? RING))));
    const [a0, a1] = span(i, n);
    const [x, y] = polar((a0 + a1) / 2, INNER);
    const pm = node.querySelector(".pm");
    pm?.setAttribute("cx", x.toFixed(2));
    pm?.setAttribute("cy", y.toFixed(2));
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
  g.appendChild(sv("path", { class: "fr", "data-r": RING }));
  if (s.med) BANDS.forEach((r, k) => g.appendChild(sv("path", { class: `led band b${k}`, "data-r": r })));
  else g.appendChild(sv("path", { class: "led", "data-r": RING }));
  g.appendChild(sv("circle", { class: "pm", r: 1.6 }));
  g.appendChild(sv("path", { class: "hit", "data-r": RING }));

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

  if (anim) {
    const rp = sv("circle", { class: `rp d-${dkey(dom)}`, cx: C, cy: C, r: RING });
    $("ge").appendChild(rp);
    setTimeout(() => rp.remove(), 1000);
  }

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
    // Only a step's first appearance decodes; revisits after hover are instant.
    const fresh = i > revealedIdx && i === steps.length - 1;
    if (fresh) revealedIdx = i;

    $("ch").textContent = s.tag;
    $("cd").textContent = label(s.dom);
    $("cn").textContent = `${pad(s.sn)}/${pad(Math.max(ringSize(), s.sn))}`;
    setGlyph(glyph(s.tag), s.med ? "med" : fresh ? "ignite" : "");

    const cx = $("cx");
    cx.className = s.med ? "med-text" : "";
    if (decodeTimer !== null) { clearTimeout(decodeTimer); decodeTimer = null; }
    cx.removeAttribute("aria-busy");
    if (fresh && !s.med && !calm && s.text.length > 0) decode(cx, s.text);
    else cx.textContent = s.text;

    ci.style.opacity = "1";
    displayIdx = i;
  }, 160);
}

// Reveal the text front to back. Characters ahead of the front show sutra
// noise; the rest is already laid out (transparent), so nothing reflows.
function decode(cx: HTMLElement, text: string): void {
  const chars = [...text];
  const n = chars.length;
  const frames = Math.max(8, Math.round(Math.min(1300, Math.max(420, n * 14)) / 24));
  const band = Math.min(14, Math.max(4, Math.round(n / 12)));
  const head = document.createTextNode("");
  const noise = document.createElement("span");
  const rest = document.createElement("span");
  noise.className = "nz";
  rest.className = "rs";
  cx.replaceChildren(head, noise, rest);
  cx.setAttribute("aria-busy", "true");
  let frame = 0;
  const tick = () => {
    frame++;
    const p = Math.min(n, Math.round((frame / frames) * n));
    if (p >= n) {
      decodeTimer = null;
      cx.textContent = text;
      cx.removeAttribute("aria-busy");
      return;
    }
    const q = Math.min(n, p + band);
    head.data = chars.slice(0, p).join("");
    noise.textContent = chars.slice(p, q)
      .map(ch => (/\s/.test(ch) ? ch : NOISE[(Math.random() * NOISE.length) | 0]))
      .join("");
    rest.textContent = chars.slice(q).join("");
    decodeTimer = setTimeout(tick, 24);
  };
  tick();
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

// Consecutive steps in the same domain count once.
function domainRuns(): string[] {
  const runs: string[] = [];
  for (const s of steps) if (runs[runs.length - 1] !== s.dom) runs.push(s.dom);
  return runs;
}

function finish(): void {
  setPin(-1);
  const nodes = stepNodes();
  nodes.forEach((node, k) => {
    node.classList.remove("now", "hol", "past");
    node.classList.add("end");
    node.style.setProperty("--k", `${((k * 1.1) / Math.max(nodes.length, 1)).toFixed(3)}s`);
  });
  layout();

  // The halo blooms outward: one thin ring of light per domain, innermost
  // first, in the order the journey visited them.
  const runs = domainRuns();
  const defs = sv("defs");
  const grad = sv("radialGradient", { id: "aura" });
  const stop = (at: number, dom: string, o: number) =>
    grad.appendChild(sv("stop", { offset: at.toFixed(4), style: `stop-color:var(--d-${dkey(dom)});stop-opacity:${o}` }));
  const inner = 0.8, outer = 0.985, w = (outer - inner) / runs.length;
  runs.forEach((dom, k) => {
    const a = inner + k * w, b = a + w * 0.62;
    stop(a, dom, 0); stop(a, dom, 1); stop(b, dom, 1); stop(b, dom, 0);
  });
  defs.appendChild(grad);
  $("tr").insertBefore(defs, $("tr").firstChild);
  $("gg").appendChild(sv("rect", { class: "aura", x: 0, y: 0, width: 120, height: 120, fill: "url(#aura)" }));

  // The journey, compiled into a line of sutra.
  const sutra = document.createElement("span");
  sutra.className = "su";
  for (const s of steps) {
    const g = glyph(s.tag);
    const ch = document.createElement("span");
    ch.className = `d-${dkey(s.dom)}`;
    ch.style.width = `${[...g[0]].length}em`;
    ch.title = `${s.tag} · ${g[1]} · ${g[2]}`;
    ch.append(g[0], inked(g[0]));
    sutra.appendChild(ch);
  }
  const trail = document.createElement("span");
  trail.textContent = runs.map(dom => label(dom).toLowerCase().replace(/-/g, "‑")).join("  ›  ");
  $("jt").replaceChildren(sutra, trail);
  $("jt").classList.add("on");
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
    setStatus(status);
    total = st;
    addStep({ tag: "begin", dom: "entry", sn: 1, status, text: txt });
  } else if (status === "MEDITATION_COMPLETE") {
    setStatus(status);
    total = st;
    reconstructFromJourney(r.journey as string);
    addStep({ tag: "meditate", dom: "meditation", sn: r.stepNumber as number, status, text: txt });
  } else if (status === "WISDOM_READY") {
    setStatus(status);
    total = st;
    reconstructFromJourney(r.finalJourney as string);
    const t = (r.finalStep as string) || "complete";
    addStep({ tag: t, dom: tagDom(t), sn: st, status, text: txt });
  } else if (status === "processing") {
    setStatus(status);
    total = st;
    reconstructFromJourney(r.journey as string);
    const tag = r.currentStep as string;
    addStep({ tag, dom: (r.wisdomDomain as string) || tagDom(tag), sn: r.stepNumber as number, status, text: txt });
  }
}

document.addEventListener("click", () => {
  if (pinnedIdx >= 0) { setPin(-1); showContent(steps.length - 1); }
});

document.querySelector(".mark")?.replaceChildren(inked(LOTUS[0]));
setGlyph(LOTUS, "idle");

// --- ext-apps SDK connection ---
const app = new App({ name: "Lotus Wisdom Journey", version: "1.0.0" });

// The shrine keeps its own palette; the host only chooses night or day.
function applyHostContext(ctx: Partial<McpUiHostContext> | undefined): void {
  if (!ctx) return;
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.safeAreaInsets) {
    const { top, right, bottom, left } = ctx.safeAreaInsets;
    const root = $("root");
    root.style.paddingTop = `${12 + top}px`;
    root.style.paddingRight = `${16 + right}px`;
    root.style.paddingBottom = `${14 + bottom}px`;
    root.style.paddingLeft = `${16 + left}px`;
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

// --- Startup: connect or simulate ---
const inIframe = window !== window.parent;

if (inIframe) {
  app.connect().then(() => {
    console.info("Lotus Wisdom: ext-apps connected");
    applyHostContext(app.getHostContext());
  }).catch((err: Error) => {
    console.error("Lotus Wisdom: ext-apps connection failed:", err);
  });
} else {
  // Standalone preview: ?theme=light for the daylight variant, ?demo=off to
  // drive it by hand through window.lotus.receive(structuredContent).
  const params = new URLSearchParams(location.search);
  const theme = params.get("theme");
  if (theme === "light" || theme === "dark") applyDocumentTheme(theme);
  (window as unknown as { lotus: unknown }).lotus = { receive };
  if (params.get("demo") !== "off") {
    const J = (...tags: string[]) => tags.join(" → ");
    const seq: Array<Record<string, unknown> & { _d: number }> = [
      { status: "FRAMEWORK_RECEIVED", totalSteps: 8, journey: "begin", contemplation: "Should the old system be rewritten, or tended?", _d: 1600 },
      { status: "processing", currentStep: "open", wisdomDomain: "process_flow", stepNumber: 2, totalSteps: 8, journey: J("begin", "open"), contemplation: "The wish to rewrite is loud. Underneath it: tiredness with code nobody fully understands any more.", _d: 2200 },
      { status: "processing", currentStep: "examine", wisdomDomain: "meta_cognitive", stepNumber: 3, totalSteps: 8, journey: J("begin", "open", "examine"), contemplation: "What does the old system know that a rewrite would have to learn again? Every strange branch was once a bug report.", _d: 2400 },
      { status: "MEDITATION_COMPLETE", stepNumber: 4, totalSteps: 8, journey: J("begin", "open", "examine", "meditate"), contemplation: "Sitting with both: the burden and the memory.", _d: 3600 },
      { status: "processing", currentStep: "recognize", wisdomDomain: "non_dual_recognition", stepNumber: 5, totalSteps: 8, journey: J("begin", "open", "examine", "meditate", "recognize"), contemplation: "Rewrite and tend are not opposites. A rewrite that cannot read the old system is only a second old system.", _d: 2400 },
      { status: "processing", currentStep: "upaya", wisdomDomain: "skillful_means", stepNumber: 6, totalSteps: 8, journey: J("begin", "open", "examine", "meditate", "recognize", "upaya"), contemplation: "So: strangle it gently. Replace one seam at a time, each one tested against what the old code actually does.", _d: 2200 },
      { status: "WISDOM_READY", totalSteps: 7, finalStep: "express", finalJourney: J("begin", "open", "examine", "meditate", "recognize", "upaya", "express"), contemplation: "Tend the system by replacing it, and let it teach the replacement.", _d: 2000 },
    ];
    let t = 900;
    for (const s of seq) {
      const delay = t;
      setTimeout(() => receive(s), delay);
      t += s._d;
    }
  }
}
