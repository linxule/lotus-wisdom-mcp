import { App } from "@modelcontextprotocol/ext-apps";

// --- Constants ---
const NS = "http://www.w3.org/2000/svg";
const CY = 26, R = 4.5, PAD = 30, VW = 400;
const MAX_VIS = 8;
const CLUSTER_W = 22;

const COLOR: Record<string, string> = {
  entry: "#7a7a8c", process_flow: "#a88430", skillful_means: "#b58a1c",
  non_dual_recognition: "#2e7d42", meta_cognitive: "#4068c8", meditation: "#2a8f7a",
};
const LABEL: Record<string, string> = {
  entry: "Entry", process_flow: "Process", skillful_means: "Skillful Means",
  non_dual_recognition: "Non-Dual", meta_cognitive: "Meta-Cognitive", meditation: "Meditation",
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

// --- State ---
interface Step { tag: string; dom: string; sn: number; st: number; med: boolean; text: string }
const steps: Step[] = [];
let done = false;
let activeGlow: SVGElement | null = null;
let displayIdx = -1;
let pinnedIdx = -1;
let pinRing: SVGElement | null = null;
let contentTimer: ReturnType<typeof setTimeout> | null = null;
let typewriterTimer: ReturnType<typeof setTimeout> | null = null;
let pendingContent = "";
let collapsedCount = 0;
let clusterG: SVGElement | null = null;

// --- Safe lookups ---
function color(dom: string): string { return COLOR[dom] ?? "#6b6b7b"; }
function label(dom: string): string { return LABEL[dom] ?? dom; }
function tagDom(tag: string): string { return TAG_DOM[tag] ?? "entry"; }

// --- DOM helpers (null-safe) ---
function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el;
}
function sv(tag: string, a?: Record<string, string | number | undefined>): SVGElement {
  const e = document.createElementNS(NS, tag);
  if (a) for (const k in a) { const v = a[k]; if (v != null) e.setAttribute(k, String(v)); }
  return e;
}

function positions(): number[] {
  const n = steps.length - collapsedCount;
  if (!n) return [];
  const left = collapsedCount > 0 ? PAD + CLUSTER_W : PAD;
  const right = VW - PAD;
  if (n === 1) return [(left + right) / 2];
  const gap = (right - left) / (n - 1);
  return Array.from({ length: n }, (_, i) => left + i * gap);
}

function reconn(newI: number): number[] {
  const p = positions();
  const vis = steps.slice(collapsedCount);
  $("gc").innerHTML = "";
  if (collapsedCount > 0 && p.length > 0) {
    $("gc").appendChild(sv("path", {
      d: `M${PAD} ${CY} L${p[0]} ${CY}`,
      fill: "none", stroke: "var(--conn)", "stroke-width": 0.4,
      "stroke-dasharray": "3 3", opacity: 0.15,
    }));
  }
  for (let i = 0; i < vis.length - 1; i++) {
    const x1 = p[i]!, x2 = p[i + 1]!;
    const mx = (x1 + x2) / 2, curve = CY - 2 - Math.random() * 1.2;
    const c = done ? (color(vis[i]!.dom)) : color(vis[i]!.dom);
    const w = done ? 1.4 : 0.8;
    const o = done ? 0.45 : 0.3;
    const attrs: Record<string, string | number> = {
      d: `M${x1} ${CY} Q${mx} ${curve} ${x2} ${CY}`,
      fill: "none", stroke: c, "stroke-width": w, opacity: o,
    };
    if (i === newI - 1 && !done) {
      const len = Math.hypot(x2 - x1, CY - curve) * 1.08;
      attrs["stroke-dasharray"] = len;
      attrs["stroke-dashoffset"] = len;
      attrs["style"] = `--len:${len};animation:draw .55s ease-out forwards`;
    }
    $("gc").appendChild(sv("path", attrs));
  }
  return p;
}

function repos(p: number[]): void {
  const nodes = $("gn").children;
  for (let i = 0; i < p.length && i < nodes.length; i++)
    (nodes[i] as SVGElement).setAttribute("transform", `translate(${p[i]},${CY})`);
  if (activeGlow && p.length)
    activeGlow.setAttribute("cx", String(p[p.length - 1]));
}

function addStep(data: { tag: string; dom: string; sn: number; st: number; status: string; text: string }, anim = true): void {
  const { tag, dom } = data;
  const clr = color(dom);
  const med = tag === "meditate";

  const prev = $("gn").querySelector(".now, .hol") as SVGElement | null;
  if (prev) {
    prev.className.baseVal = "sn past";
    const pc = prev.querySelector("circle:last-of-type") as SVGElement | null;
    if (pc) { pc.style.animation = "none"; pc.setAttribute("opacity", ".35"); }
  }

  steps.push({ tag, dom, sn: data.sn, st: data.st, med, text: data.text || "" });

  if (steps.length - collapsedCount > MAX_VIS) {
    const oldest = $("gn").firstChild;
    if (oldest) (oldest as Element).remove();
    collapsedCount++;
    if (pinnedIdx >= 0 && pinnedIdx < collapsedCount) { pinnedIdx = -1; updatePinRing(); }
    updateCluster();
  }

  const visIdx = anim ? (steps.length - collapsedCount - 1) : -1;
  const p = reconn(visIdx);
  repos(p);
  const x = p[p.length - 1] ?? VW / 2;

  if (activeGlow) activeGlow.remove();
  activeGlow = sv("circle", { cx: x, cy: CY, r: 20, fill: clr, opacity: anim ? 0.04 : 0 });
  $("gg").appendChild(activeGlow);

  const cls = anim ? (med ? "sn hol" : "sn now") : "sn end";
  const g = sv("g", { transform: `translate(${x},${CY})`, class: cls }) as SVGGElement;
  g.dataset.i = String(steps.length - 1);

  const circle = med
    ? sv("circle", { cx: 0, cy: 0, r: R, fill: "none", stroke: clr, "stroke-width": 1.2 })
    : sv("circle", { cx: 0, cy: 0, r: R, fill: clr });
  if (!anim) circle.setAttribute("opacity", ".88");

  g.appendChild(sv("circle", { cx: 0, cy: 0, r: R * 3, fill: "transparent" }));
  g.appendChild(circle);
  g.addEventListener("mouseenter", () => showContent(+(g.dataset.i ?? "0")));
  g.addEventListener("mouseleave", () => showContent(pinnedIdx >= 0 ? pinnedIdx : steps.length - 1));
  g.addEventListener("click", (e: Event) => { e.stopPropagation(); togglePin(+(g.dataset.i ?? "0")); });
  $("gn").appendChild(g);

  if (anim) {
    const rg = sv("g", { transform: `translate(${x},${CY})` });
    rg.appendChild(sv("circle", { cx: 0, cy: 0, r: R, fill: "none", stroke: clr, "stroke-width": 0.6, class: "rp" }));
    $("ge").appendChild(rg);
    setTimeout(() => rg.remove(), 1000);
  }

  $("void").style.opacity = "0";
  $("tr").setAttribute("aria-label", "Journey: " + steps.map(s => s.tag).join(" \u2192 "));

  pinnedIdx = -1;
  updatePinRing();
  showContent(steps.length - 1);
  $("ct").classList.add("on");

  if (data.status === "WISDOM_READY") {
    done = true;
    setTimeout(finish, 600);
  }
}

function showContent(i: number): void {
  if (i < 0 || i >= steps.length) return;
  if (contentTimer) { clearTimeout(contentTimer); contentTimer = null; }
  const s = steps[i]!;
  const c = color(s.dom);

  if (i === displayIdx) {
    $("ch").style.color = c;
    $("cd").style.color = c;
    $("ci").style.borderLeftColor = c + "28";
    return;
  }

  const ci = $("ci");
  ci.style.opacity = "0";

  contentTimer = setTimeout(() => {
    $("ch").textContent = s.tag;
    $("ch").style.color = c;
    $("cd").textContent = label(s.dom);
    $("cd").style.color = c;
    $("cn").textContent = `step ${s.sn}`;
    ci.style.borderLeftColor = c + "28";

    const cx = $("cx");
    cx.className = s.med ? "med-text" : "";

    // Typewriter effect for fresh steps; instant for hover/pin recall
    if (typewriterTimer) { clearTimeout(typewriterTimer); typewriterTimer = null; }
    const isNewStep = i === steps.length - 1 && i !== displayIdx;
    if (isNewStep && s.text.length > 0 && !s.med) {
      cx.textContent = "";
      let pos = 0;
      const chars = [...s.text];
      const delay = Math.max(8, Math.min(25, 1200 / chars.length));
      const tick = () => {
        const chunk = Math.ceil(chars.length / 60);
        pos = Math.min(pos + chunk, chars.length);
        cx.textContent = chars.slice(0, pos).join("");
        if (pos < chars.length) typewriterTimer = setTimeout(tick, delay);
      };
      tick();
    } else {
      cx.textContent = s.text;
    }

    ci.style.opacity = "1";
    $("ct").scrollTop = 0;
    displayIdx = i;
  }, 160);
}

function togglePin(i: number): void {
  if (pinnedIdx === i) { pinnedIdx = -1; showContent(steps.length - 1); }
  else { pinnedIdx = i; showContent(i); }
  updatePinRing();
}

function updatePinRing(): void {
  if (pinRing) { pinRing.remove(); pinRing = null; }
  if (pinnedIdx < 0 || pinnedIdx >= steps.length) return;
  const s = steps[pinnedIdx]!;
  const c = color(s.dom);
  pinRing = sv("circle", { cx: 0, cy: 0, r: R + 3.5, fill: "none", stroke: c, "stroke-width": 0.5, opacity: 0.4, style: "pointer-events:none" });
  const childIdx = pinnedIdx - collapsedCount;
  const node = childIdx >= 0 ? $("gn").children[childIdx] : undefined;
  if (node) node.appendChild(pinRing);
}

function updateCluster(): void {
  if (collapsedCount === 0) {
    if (clusterG) { clusterG.remove(); clusterG = null; }
    return;
  }
  if (!clusterG) {
    clusterG = sv("g");
    $("tr").insertBefore(clusterG, $("gc"));
  }
  clusterG.innerHTML = "";
  const dots = [
    { x: 10, r: 1.5, o: 0.1 },
    { x: 17, r: 1.5, o: 0.18 },
    { x: 24, r: 2, o: 0.28 },
  ];
  for (const d of dots) {
    clusterG.appendChild(sv("circle", { cx: d.x, cy: CY, r: d.r, fill: "var(--dim)", opacity: d.o }));
  }
  const txt = document.createElementNS(NS, "text");
  txt.setAttribute("x", "17");
  txt.setAttribute("y", String(CY + 12));
  txt.setAttribute("text-anchor", "middle");
  txt.setAttribute("font-size", "7");
  txt.setAttribute("fill", "var(--dim)");
  txt.setAttribute("opacity", "0.35");
  txt.textContent = `+${collapsedCount}`;
  clusterG.appendChild(txt);
}

function finish(): void {
  pinnedIdx = -1;
  if (pinRing) { pinRing.remove(); pinRing = null; }
  const nodes = $("gn").children;
  for (let i = 0; i < nodes.length; i++) {
    (nodes[i] as SVGElement).className.baseVal = "sn end";
    const c = nodes[i]!.querySelector("circle:last-of-type") as SVGElement | null;
    if (c) { c.style.animation = "none"; c.setAttribute("opacity", ".88"); }
  }
  if (activeGlow) { activeGlow.remove(); activeGlow = null; }
  reconn(-1);

  const doms: string[] = [];
  let prev = "";
  for (const s of steps) { if (s.dom !== prev) { doms.push((label(s.dom)).toLowerCase()); prev = s.dom; } }
  $("jt").textContent = doms.join("  \u2192  ");
  $("jt").classList.add("on");

  const defs = sv("defs");
  const grad = sv("linearGradient", { id: "ag" });
  const uq: Step[] = []; let up = "";
  for (const s of steps) { if (s.dom !== up) { uq.push(s); up = s.dom; } }
  uq.forEach((s, i) => {
    grad.appendChild(sv("stop", { offset: `${(i / Math.max(uq.length - 1, 1)) * 100}%`, "stop-color": color(s.dom) }));
  });
  defs.appendChild(grad);
  $("tr").insertBefore(defs, $("tr").firstChild);
  const glowX = collapsedCount > 0 ? PAD + CLUSTER_W : PAD;
  const glow = sv("rect", { x: glowX, y: 8, width: VW - PAD - glowX, height: 36, fill: "url(#ag)", rx: 18, opacity: 0 });
  (glow as SVGElement & { style: CSSStyleDeclaration }).style.animation = "ambient 7s ease-in-out 1s infinite";
  $("ge").appendChild(glow);
}

// --- Reconstruct journey from a single result ---
function reconstructFromJourney(journeyStr: string | undefined, totalSteps: number): void {
  if (!journeyStr || steps.length > 0) return;
  const tags = journeyStr.split(" \u2192 ");
  for (let i = 0; i < tags.length - 1; i++) {
    const mt = tags[i]!.trim();
    addStep({ tag: mt, dom: tagDom(mt), sn: i + 1, st: totalSteps, status: "processing", text: "" }, false);
  }
}

// --- Parse tool result from any format ---
function parseToolResult(result: Record<string, unknown>): Record<string, unknown> | null {
  // Prefer structuredContent (typed output)
  if (result.structuredContent && typeof result.structuredContent === "object") {
    const sc = result.structuredContent as Record<string, unknown>;
    if (sc.status) return sc;
  }
  // Fall back to text content
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

// --- Receive parsed result ---
function receive(r: Record<string, unknown>): void {
  if (!r || !r.status) return;
  const txt = pendingContent || (r.contemplation as string) || "";
  pendingContent = "";

  const st = (r.totalSteps as number) || (r.stepNumber as number) || 8;

  if (r.status === "FRAMEWORK_RECEIVED") {
    addStep({ tag: "begin", dom: "entry", sn: 1, st, status: r.status as string, text: txt });
  } else if (r.status === "MEDITATION_COMPLETE") {
    reconstructFromJourney(r.journey as string, st);
    addStep({ tag: "meditate", dom: "meditation", sn: r.stepNumber as number, st, status: r.status as string, text: txt });
  } else if (r.status === "WISDOM_READY") {
    reconstructFromJourney(r.finalJourney as string, st);
    const t = (r.finalStep as string) || "complete";
    addStep({ tag: t, dom: tagDom(t), sn: st, st, status: r.status as string, text: txt });
  } else if (r.status === "processing") {
    reconstructFromJourney(r.journey as string, st);
    addStep({ tag: r.currentStep as string, dom: r.wisdomDomain as string, sn: r.stepNumber as number, st, status: r.status as string, text: txt });
  }
}

// Unpin on document click
document.addEventListener("click", () => {
  if (pinnedIdx >= 0) { pinnedIdx = -1; updatePinRing(); showContent(steps.length - 1); }
});

// --- ext-apps SDK connection ---
const app = new App({ name: "Lotus Wisdom Journey", version: "1.0.0" });

app.ontoolinput = (params: Record<string, unknown>) => {
  const args = params.arguments as Record<string, unknown> | undefined;
  if (args?.content) pendingContent = args.content as string;
};

app.ontoolresult = (result: Record<string, unknown>) => {
  const parsed = parseToolResult(result);
  if (parsed) receive(parsed);
};

app.onerror = (err: Error) => console.error("Lotus Wisdom ext-apps error:", err);

// --- Startup: connect or simulate ---
const inIframe = window !== window.parent;

if (inIframe) {
  // In an ext-apps host — connect via SDK
  app.connect().then(() => {
    console.info("Lotus Wisdom: ext-apps connected");
  }).catch((err: Error) => {
    console.error("Lotus Wisdom: ext-apps connection failed:", err);
    // Don't run simulation — let the error be visible
  });
} else {
  // Standalone — run demo simulation
  const seq: Array<Record<string, unknown> & { _d: number }> = [
    { status: "FRAMEWORK_RECEIVED", totalSteps: 8, contemplation: "Beginning contemplative journey to design the visual form of lotus wisdom.", _d: 1000 },
    { status: "processing", currentStep: "open", wisdomDomain: "process_flow", stepNumber: 2, totalSteps: 8, contemplation: "The core tension: lotus wisdom is a contemplative process that unfolds in time \u2014 a journey through domains.", _d: 1800 },
    { status: "processing", currentStep: "recognize", wisdomDomain: "non_dual_recognition", stepNumber: 3, totalSteps: 8, contemplation: "I recognize the visual should NOT be busy. The UI should breathe.", _d: 2200 },
    { status: "processing", currentStep: "examine", wisdomDomain: "meta_cognitive", stepNumber: 4, totalSteps: 8, contemplation: "The ext-apps iframe receives tool results via postMessage.", _d: 1600 },
    { status: "MEDITATION_COMPLETE", stepNumber: 5, totalSteps: 8, journey: "begin \u2192 open \u2192 recognize \u2192 examine \u2192 meditate", contemplation: "Pausing to let the visual form emerge.", _d: 3200 },
    { status: "processing", currentStep: "integrate", wisdomDomain: "non_dual_recognition", stepNumber: 6, totalSteps: 8, journey: "begin \u2192 open \u2192 recognize \u2192 examine \u2192 meditate \u2192 integrate", contemplation: "The visual form should mirror the journey\u2019s own structure.", _d: 2400 },
    { status: "processing", currentStep: "refine", wisdomDomain: "meta_cognitive", stepNumber: 7, totalSteps: 8, journey: "begin \u2192 open \u2192 recognize \u2192 examine \u2192 meditate \u2192 integrate \u2192 refine", contemplation: "Three visual layers: trace, content, completion.", _d: 1800 },
    { status: "WISDOM_READY", totalSteps: 8, finalStep: "express", finalJourney: "begin \u2192 open \u2192 recognize \u2192 examine \u2192 meditate \u2192 integrate \u2192 refine \u2192 express", contemplation: "The visual design emerges as a living journey trace.", _d: 2000 },
  ];
  let t = 1200;
  for (const s of seq) {
    const delay = t;
    setTimeout(() => receive(s), delay);
    t += s._d;
  }
}
