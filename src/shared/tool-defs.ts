// Shared MCP tool & server metadata: zod schemas, annotations, descriptions,
// server instructions, and ext-apps constants. Imported by both index.ts
// (stdio) and worker/src/index.ts so the two transports declare identical
// tools, validation, and output shapes.

import { z } from "zod";
import { CORE_TAGS, INPUT_DEFAULTS } from "./wisdom.js";
import { VERSION } from "./version.js";

export const SERVER_NAME = "lotus-wisdom";

// Surfaced in the initialize response so the host/model knows how to drive the
// server (rather than burying the only usage hint inside a tool description).
export const SERVER_INSTRUCTIONS =
  "Lotus Wisdom is a contemplative reasoning aid. Begin every inquiry by calling the `lotuswisdom` tool with tag='begin' to receive the framework, then iterate with contemplation tags (open, examine, recognize, integrate, …). Do NOT speak the final wisdom until a step returns status='WISDOM_READY'. In stateless clients, pass the `journey` string from the previous response forward as `previousJourney` to preserve continuity. Use `lotuswisdom_summary` to inspect the journey so far.";

// --- Ext-apps UI resource -------------------------------------------------

export const RESOURCE_URI = "ui://lotuswisdom/journey.html";
export const EXT_APPS_MIME = "text/html;profile=mcp-app" as const;

export const LOTUS_TOOL_META = {
  ui: { resourceUri: RESOURCE_URI },
  "ui/resourceUri": RESOURCE_URI,
} as const;

// --- Branding / discoverability -------------------------------------------

export const ICON_URL =
  "https://raw.githubusercontent.com/linxule/lotus-wisdom-mcp/main/assets/lotus-logo-smithery.png";
export const WEBSITE_URL = "https://lotus-wisdom-mcp.linxule.workers.dev";

// Implementation info advertised in the initialize handshake — the authoritative
// channel clients use for the server's display name and icon.
export const SERVER_INFO = {
  name: SERVER_NAME,
  version: VERSION,
  title: "Lotus Wisdom",
  websiteUrl: WEBSITE_URL,
  icons: [{ src: ICON_URL, mimeType: "image/png", sizes: ["512x512"] }],
};

// --- Tool identity --------------------------------------------------------

export const LOTUS_TOOL_NAME = "lotuswisdom";
export const SUMMARY_TOOL_NAME = "lotuswisdom_summary";

export const LOTUS_TOOL_TITLE = "Lotus Wisdom";
export const SUMMARY_TOOL_TITLE = "Lotus Wisdom Journey Summary";

export const LOTUS_DESCRIPTION = `Contemplative reasoning tool. Use for complex problems needing multi-perspective understanding, contradictions requiring integration, or questions holding their own wisdom.

**Workflow:** Always start with tag='begin' (returns framework). Then continue with contemplation tags. Do NOT output wisdom until status='WISDOM_READY'.

**Tags:** begin (FIRST - receives framework), then: open/engage/express (process), examine/reflect/verify/refine/complete (meta-cognitive), recognize/transform/integrate/transcend/embody (non-dual), upaya/expedient/direct/gradual/sudden (skillful-means), meditate (pause).`;

export const SUMMARY_DESCRIPTION =
  "Get a summary of the current contemplative journey";

// Both tools are pure, side-effect-free, read-only functions. These hints are a
// hard Claude Directory review criterion (auto-permission / safe-to-call UX).
export const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

// --- Input schemas (zod raw shapes) ---------------------------------------

export const lotusInputShape = {
  tag: z
    .enum(CORE_TAGS as [string, ...string[]])
    .describe("Current processing technique (wisdom-domain tag)"),
  // Required (non-empty) for every tag. A begin-specific default here would
  // silently fill non-begin steps with placeholder text; processThought still
  // applies the begin default defensively for direct (non-schema) callers.
  content: z
    .string()
    .min(1)
    .describe("Your contemplation for this step"),
  stepNumber: z
    .number()
    .int()
    .min(1)
    .default(INPUT_DEFAULTS.stepNumber)
    .describe("Current step number"),
  totalSteps: z
    .number()
    .int()
    .min(1)
    .default(INPUT_DEFAULTS.totalSteps)
    .describe("Estimated total steps needed (adjustable as you go)"),
  nextStepNeeded: z
    .boolean()
    .default(INPUT_DEFAULTS.nextStepNeeded)
    .describe("Whether another step is needed"),
  isMeditation: z
    .boolean()
    .optional()
    .describe("Whether this step is a meditative pause"),
  meditationDuration: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Duration for the meditation pause in seconds (1-10)"),
  previousJourney: z
    .string()
    .optional()
    .describe(
      'Pass the journey string from the previous response to maintain journey tracking (e.g. "begin → open → examine").',
    ),
};

export const summaryInputShape = {
  previousJourney: z
    .string()
    .optional()
    .describe(
      "Pass the journey string from a previous response to reconstruct the current journey summary.",
    ),
};

// --- Output schemas (zod raw shapes) --------------------------------------
//
// Advertised in tools/list and validated against structuredContent. NOTE: the
// SDK validates but transmits the RAW structuredContent (it does not re-emit the
// stripped value), so list every field a non-'begin' variant emits to keep the
// ADVERTISED schema complete. The 'begin' framework's nested objects are
// flattened by structuredContentFor() (wisdom.ts) before return; the full
// framework rides in the text content block. tests/ guard both invariants.

const JOURNEY_STEP = z.object({
  tag: z.string(),
  domain: z.string().optional(),
  stepNumber: z.number(),
  brief: z.string(),
});

export const lotusOutputShape = {
  status: z.string(),
  contemplation: z.string().optional(),
  welcome: z.string().optional(),
  currentStep: z.string().optional(),
  finalStep: z.string().optional(),
  wisdomDomain: z.string().optional(),
  journey: z.string().optional(),
  finalJourney: z.string().optional(),
  domainJourney: z.string().optional(),
  stepNumber: z.number().optional(),
  totalSteps: z.number().optional(),
  nextStepNeeded: z.boolean().optional(),
  processLength: z.number().optional(),
  journeyLength: z.number().optional(),
  processComplete: z.boolean().optional(),
  instruction: z.string().optional(),
  duration: z.number().optional(),
  prompt: z.string().optional(),
  steps: z.array(JOURNEY_STEP).optional(),
};

export const summaryOutputShape = {
  status: z.string(),
  journeyLength: z.number(),
  domainJourney: z.string(),
  steps: z.array(JOURNEY_STEP),
};
