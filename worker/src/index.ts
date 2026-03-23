import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpHandler } from "agents/mcp";
import { z } from "zod";
import journeyHtml from "../../app/dist/mcp-app.html";

// --- Core wisdom domain logic (ported from ../index.ts) ---

const WISDOM_DOMAINS: Record<string, string[]> = {
  entry: ["begin"],
  skillful_means: ["upaya", "expedient", "direct", "gradual", "sudden"],
  non_dual_recognition: [
    "recognize",
    "transform",
    "integrate",
    "transcend",
    "embody",
  ],
  meta_cognitive: ["examine", "reflect", "verify", "refine", "complete"],
  process_flow: ["open", "engage", "express"],
  meditation: ["meditate"],
};

const CORE_TAGS = Object.values(WISDOM_DOMAINS).flat();

function getWisdomDomain(tag: string): string {
  for (const [domain, tags] of Object.entries(WISDOM_DOMAINS)) {
    if (tags.includes(tag)) return domain;
  }
  return "unknown";
}

interface LotusThoughtData {
  tag: string;
  content: string;
  stepNumber: number;
  totalSteps: number;
  nextStepNeeded: boolean;
  isMeditation?: boolean;
  meditationDuration?: number;
  wisdomDomain?: string;
}

// --- Framework text returned on tag='begin' ---

function buildFrameworkResponse(content: string) {
  return {
    status: "FRAMEWORK_RECEIVED",
    contemplation: content,
    welcome:
      "Welcome to the Lotus Wisdom framework. Read this before continuing your contemplative journey.",
    philosophy: {
      core: "The Lotus Sutra teaches that there are many skillful means to reach the same truth. These tags are not rigid steps but different aspects of wisdom that interpenetrate and respond to what each moment needs.",
      essence:
        "The wisdom channels itself through your choices. Each step contains all others\u2014when you truly recognize, you are already transforming. The tool simply mirrors your journey without judgment.",
      trust:
        "Trust what each moment calls for. The path reveals itself in the walking.",
    },
    domains: {
      process_flow: {
        tags: ["open", "engage", "express"],
        spirit:
          "The natural arc of inquiry. Opening creates space for what wants to emerge. Engagement explores with curiosity and presence. Expression shares what arose\u2014not as conclusion, but as offering.",
        role: "A container that can hold any of the other approaches within it.",
      },
      skillful_means: {
        tags: ["upaya", "expedient", "direct", "gradual", "sudden"],
        spirit:
          "Many ways lead to understanding. Sometimes direct pointing cuts through confusion instantly. Sometimes patient, gradual unfolding is what serves. Upaya is the art of meeting each situation with what it actually needs.",
        role: "Different approaches to truth\u2014the medicine that fits the illness.",
      },
      non_dual_recognition: {
        tags: ["recognize", "transform", "integrate", "transcend", "embody"],
        spirit:
          "Awakening to what is already present. Recognition and transformation are not separate\u2014to truly see IS already to change. Integration weaves apparent opposites. Transcendence sees beyond the frame. Embodiment lives the understanding.",
        role: "The alchemical heart of the journey\u2014where seeing becomes being.",
      },
      meta_cognitive: {
        tags: ["examine", "reflect", "verify", "refine", "complete"],
        spirit:
          "The mind watching its own understanding unfold. Gentle examination, not harsh judgment. Reflection that deepens rather than distances. Verification that grounds insight in reality. Refinement that polishes without force.",
        role: "The witness consciousness that ensures clarity and completeness.",
      },
      meditation: {
        tags: ["meditate"],
        spirit:
          "Pause. Let thoughts settle like silt in still water. Insight often emerges from stillness, not effort. The gap between thoughts holds wisdom that activity cannot reach.",
        role: "Sacred pause\u2014creating space for what cannot be grasped to be received.",
      },
    },
    patterns: {
      note: "Common flows (not rules\u2014let the inquiry guide you):",
      suggestions: [
        "Opening often involves open, recognize, or examine\u2014creating space and initial contact",
        "Engagement might use direct, gradual, or upaya approaches\u2014working with what arose",
        "Integration can happen through integrate, transcend, or sudden insight\u2014weaving understanding",
        "Completion often flows through express, embody, or complete\u2014bringing forth and grounding",
      ],
      flexibility:
        "These patterns are descriptive, not prescriptive. Some inquiries need only two steps. Others spiral through many. Trust what wants to happen.",
    },
    guidance: {
      interpenetration:
        "These domains interpenetrate\u2014each step contains echoes of all others. A moment of recognition may also be transformation. An examination may suddenly become meditation.",
      uncertainty:
        "When uncertain, sit with the uncertainty. The fog is not an obstacle; it is part of the journey. Not-knowing is its own form of wisdom.",
      workflow:
        "Call lotuswisdom iteratively with different tags. The tool processes your contemplation internally\u2014do NOT output wisdom until you receive status=WISDOM_READY. Then speak naturally in your own voice.",
      next: 'Proceed with stepNumber: 2 using any tag that feels right (often "open" or "examine" to start).',
    },
    parameters: {
      tag: "The current processing technique\u2014choose from any wisdom domain",
      content:
        "Your contemplation for this step\u2014what you are thinking, seeing, or understanding",
      stepNumber: "Current step in your journey (this begin step is 1)",
      totalSteps:
        "Your estimate of total steps needed (can adjust as you go)",
      nextStepNeeded: "Set true to continue, false when ready to complete",
      isMeditation:
        "Set true when using the meditate tag for a contemplative pause",
      meditationDuration: "Optional seconds (1-10) for meditation pauses",
      previousJourney:
        "Pass the journey string from the previous response to maintain visual continuity (e.g. the journey field value).",
    },
    responses: {
      processing: "Normal steps return status=processing with journey tracking",
      wisdomDomain: "Which domain your current tag belongs to",
      journey:
        'Your complete tag path so far (e.g., "open \u2192 examine \u2192 direct \u2192 integrate")',
      domainJourney:
        'Movement between wisdom domains (e.g., "process_flow \u2192 meta_cognitive \u2192 skillful_means")',
      meditation:
        "The meditate tag returns status=MEDITATION_COMPLETE with a prompt asking what emerged from stillness",
      completion:
        "When nextStepNeeded=false, you receive status=WISDOM_READY\u2014then speak the final wisdom naturally in your own voice",
    },
    whenToUse: [
      "Breaking down complex problems requiring multi-faceted understanding",
      "Questions that benefit from both direct and gradual approaches",
      "Problems where apparent contradictions need integration",
      "Situations requiring both analytical and intuitive understanding",
      "Tasks that benefit from meditative pauses to allow insight",
      "Questions containing their own inherent wisdom",
    ],
  };
}

// --- Helper: build journey strings from thought array ---

function buildJourney(steps: LotusThoughtData[]) {
  const journey = steps.map((s) => s.tag).join(" \u2192 ");
  const domainJourney = steps
    .map((s) => s.wisdomDomain)
    .filter((d, i, a) => i === 0 || d !== a[i - 1])
    .join(" \u2192 ");
  return { journey, domainJourney };
}

function parsePreviousJourney(
  previousJourney?: string,
  totalSteps?: number,
): LotusThoughtData[] {
  if (!previousJourney) return [];

  const prevTags = previousJourney
    .split(" \u2192 ")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const resolvedTotalSteps = Math.max(totalSteps ?? prevTags.length, prevTags.length);

  return prevTags.map((tag, index) => ({
    tag,
    content: "",
    stepNumber: index + 1,
    totalSteps: resolvedTotalSteps,
    nextStepNeeded: true,
    wisdomDomain: getWisdomDomain(tag),
  }));
}

// --- Process a single thought step ---

function processThought(
  input: {
    tag: string;
    content: string;
    stepNumber: number;
    totalSteps: number;
    nextStepNeeded: boolean;
    isMeditation?: boolean;
    meditationDuration?: number;
    previousJourney?: string;
  },
  thoughtProcess: LotusThoughtData[]
): { response: string; thoughtProcess: LotusThoughtData[] } {
  // Auto-fill defaults for 'begin'
  if (input.tag === "begin") {
    input.content = input.content || "Beginning contemplative journey";
    input.stepNumber = input.stepNumber || 1;
    input.totalSteps = input.totalSteps || 5;
    input.nextStepNeeded = input.nextStepNeeded ?? true;
  }

  // Reset on step 1
  if (input.stepNumber === 1) {
    thoughtProcess = [];
  }

  // Reconstruct journey from previousJourney when server state is empty
  // (handles stateless/sessionless clients like claude.ai Connectors)
  if (thoughtProcess.length === 0 && input.previousJourney && input.tag !== "begin") {
    thoughtProcess = parsePreviousJourney(input.previousJourney, input.totalSteps);
  }

  // Adjust totalSteps if needed
  let totalSteps = input.totalSteps;
  if (input.stepNumber > totalSteps) {
    totalSteps = input.stepNumber;
  }

  const wisdomDomain = getWisdomDomain(input.tag);
  const step: LotusThoughtData = {
    ...input,
    totalSteps,
    wisdomDomain,
  };
  thoughtProcess = [...thoughtProcess, step];

  // Begin: return framework
  if (input.tag === "begin") {
    return {
      response: JSON.stringify(buildFrameworkResponse(input.content), null, 2),
      thoughtProcess,
    };
  }

  // Meditation
  if (input.tag === "meditate") {
    const { journey } = buildJourney(thoughtProcess);
    return {
      response: JSON.stringify(
        {
          status: "MEDITATION_COMPLETE",
          contemplation: input.content,
          duration: input.meditationDuration || 3,
          prompt: "What insights emerged during the pause?",
          instruction: "Continue with what arose from stillness",
          stepNumber: input.stepNumber,
          totalSteps,
          journey,
        },
        null,
        2
      ),
      thoughtProcess,
    };
  }

  // Any tag with nextStepNeeded=false completes the journey
  if (!input.nextStepNeeded) {
    const { journey, domainJourney } = buildJourney(thoughtProcess);
    return {
      response: JSON.stringify(
        {
          status: "WISDOM_READY",
          contemplation: input.content,
          processComplete: true,
          finalStep: input.tag,
          instruction:
            input.tag === "express"
              ? "NOW_SPEAK_THE_WISDOM_NATURALLY"
              : "PROCESS_COMPLETE_SPEAK_WISDOM",
          totalSteps: input.stepNumber,
          journeyLength: thoughtProcess.length,
          finalJourney: journey,
          domainJourney,
        },
        null,
        2
      ),
      thoughtProcess,
    };
  }

  // Normal processing step
  const { journey, domainJourney } = buildJourney(thoughtProcess);
  return {
    response: JSON.stringify(
      {
        status: "processing",
        contemplation: input.content,
        currentStep: input.tag,
        wisdomDomain,
        journey,
        domainJourney,
        stepNumber: input.stepNumber,
        totalSteps,
        nextStepNeeded: input.nextStepNeeded,
        processLength: thoughtProcess.length,
      },
      null,
      2
    ),
    thoughtProcess,
  };
}

type Env = {
  ANALYTICS: AnalyticsEngineDataset;
};

// --- Analytics helpers ---

function track(env: Env, data: { blobs: string[]; doubles?: number[]; indexes: string[] }) {
  try { env.ANALYTICS?.writeDataPoint(data); } catch {}
}

function parseClient(ua: string): string {
  const lower = ua.toLowerCase();
  if (lower === "claude-user") return "claude-ai";
  if (lower.startsWith("claude/") && lower.includes("cfnetwork")) return "claude-ios";
  if (lower.includes("claude-ai") || lower.includes("claude.ai")) return "claude-ai";
  if (lower.includes("claude-code") || lower.includes("claude code")) return "claude-code";
  if (lower.includes("cherrystudio")) return "cherrystudio";
  if (lower.includes("cursor")) return "cursor";
  if (lower.includes("gemini")) return "gemini";
  if (lower.includes("windsurf")) return "windsurf";
  if (lower.includes("cline")) return "cline";
  if (lower.includes("smithery")) return "smithery";
  if (lower.includes("mcp-remote")) return "mcp-remote";
  if (lower.includes("openai-mcp")) return "openai";
  if (lower.includes("go-http-client")) return "go-client";
  if (lower === "undici") return "undici";
  if (lower === "node") return "node";
  return "unknown";
}

// v4 unified schema — three event types, all indexed on client
// blob1=event, blob2=tag, blob3=domain, blob4=raw_ua
// double1=step_number, double2=total_steps, double3=next_needed (1=yes, 0=no)
function trackRequest(env: Env, ctx: ExecutionContext, request: Request) {
  const rawUA = request.headers.get("user-agent") ?? "";
  const client = parseClient(rawUA);
  const truncUA = rawUA.substring(0, 200);

  if (request.method === "GET") {
    // Session event: new SSE connection
    track(env, {
      blobs: ["session", "", "", truncUA],
      indexes: [client],
    });
    return;
  }

  if (request.method !== "POST") return; // skip DELETE etc.

  const cloned = request.clone();
  ctx.waitUntil(
    cloned.json().then((body: any) => {
      if (body?.method !== "tools/call" || !body?.params?.name) return;

      const toolName = body.params.name;
      const args = body.params.arguments ?? {};

      if (toolName === "lotuswisdom") {
        // Step event: contemplation step
        const tag = args.tag ?? "";
        track(env, {
          blobs: ["step", tag, tag ? getWisdomDomain(tag) : "", truncUA],
          doubles: [args.stepNumber ?? 0, args.totalSteps ?? 0, args.nextStepNeeded === false ? 0 : 1],
          indexes: [client],
        });
      } else if (toolName === "lotuswisdom_summary") {
        // Summary event: journey summary request
        track(env, {
          blobs: ["summary", "", "", truncUA],
          indexes: [client],
        });
      }
    }).catch(() => {})
  );
}

// =============================================================================
// Server factory — creates a fresh McpServer per request, state via callbacks
// =============================================================================

const RESOURCE_URI = "ui://lotuswisdom/journey.html";
const EXT_APPS_MIME = "text/html;profile=mcp-app" as const;

function createWisdomServer(): McpServer {
  const server = new McpServer({
    name: "lotus-wisdom",
    version: "0.7.0",
  });

  // Advertise ext-apps support
  server.server.registerCapabilities({
    extensions: { "io.modelcontextprotocol/ui": {} },
  } as any);

  // Ext-apps UI resource
  server.resource(
    RESOURCE_URI,
    RESOURCE_URI,
    { mimeType: EXT_APPS_MIME, description: "Interactive visualization of the contemplative journey" },
    async () => ({
      contents: [{ uri: RESOURCE_URI, mimeType: EXT_APPS_MIME, text: journeyHtml }],
    })
  );

  // Tool: lotuswisdom (registerTool for _meta support — server.tool() drops _meta)
  server.registerTool(
    "lotuswisdom",
    {
      title: "Lotus Wisdom",
      description:
        `Contemplative reasoning tool. Use for complex problems needing multi-perspective understanding, contradictions requiring integration, or questions holding their own wisdom.

**Workflow:** Always start with tag='begin' (returns framework). Then continue with contemplation tags. Do NOT output wisdom until status='WISDOM_READY'.

**Tags:** begin (FIRST - receives framework), then: open/engage/express (process), examine/reflect/verify/refine/complete (meta-cognitive), recognize/transform/integrate/transcend/embody (non-dual), upaya/expedient/direct/gradual/sudden (skillful-means), meditate (pause).`,
      inputSchema: z.object({
        tag: z.enum(CORE_TAGS as [string, ...string[]]),
        content: z.string().default("Beginning contemplative journey"),
        stepNumber: z.number().int().min(1).default(1),
        totalSteps: z.number().int().min(1).default(5),
        nextStepNeeded: z.boolean().default(true),
        isMeditation: z.boolean().optional(),
        meditationDuration: z.number().int().min(1).max(10).optional(),
        previousJourney: z.string().optional().describe(
          "Pass the journey string from the previous step's response to maintain journey tracking (e.g. \"begin → open → examine\")."
        ),
      }),
      _meta: {
        ui: { resourceUri: RESOURCE_URI },
        "ui/resourceUri": RESOURCE_URI,
      },
    },
    async (input) => {
      try {
        const result = processThought(input, []);
        return {
          content: [{ type: "text" as const, text: result.response }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { error: error instanceof Error ? error.message : String(error), status: "failed" },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: lotuswisdom_summary
  server.tool(
    "lotuswisdom_summary",
    "Get a summary of the current contemplative journey",
    {
      previousJourney: z.string().optional().describe(
        "Pass the journey string from a previous response to reconstruct the current journey summary.",
      ),
    },
    async (input) => {
      const steps = parsePreviousJourney(input.previousJourney);
      const { domainJourney } = buildJourney(steps);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                journeyLength: steps.length,
                domainJourney,
                steps: steps.map((s) => ({
                  tag: s.tag,
                  domain: s.wisdomDomain,
                  stepNumber: s.stepNumber,
                  brief: s.content.substring(0, 50) + "...",
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  return server;
}

// =============================================================================
// Worker fetch handler — stateless JSON-only Streamable HTTP
// =============================================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/mcp" || url.pathname === "/mcp/") {
      trackRequest(env, ctx, request);

      if (request.method === "GET") {
        return new Response("SSE not supported", {
          status: 405,
          headers: { Allow: "POST, DELETE" },
        });
      }

      const server = createWisdomServer();
      const handler = createMcpHandler(server, { enableJsonResponse: true });
      return handler(request, env, ctx);
    }

    // Redirect favicon traffic directly to the cached asset upstream.
    if (url.pathname === "/favicon.ico" || url.pathname === "/favicon.png") {
      return new Response(null, {
        status: 301,
        headers: {
          Location:
            "https://raw.githubusercontent.com/linxule/lotus-wisdom-mcp/main/assets/lotus-logo-smithery.png",
          "cache-control": "public, max-age=604800",
        },
      });
    }

    // Landing page (HTML so Google's favicon crawler finds the <link rel="icon">)
    if (url.pathname === "/" || url.pathname === "") {
      return new Response(
        `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Lotus Wisdom MCP</title>
<link rel="icon" type="image/png" href="/favicon.png">
</head><body style="font-family:system-ui;max-width:520px;margin:40px auto;color:#333">
<h1>Lotus Wisdom MCP Server v0.7.0</h1>
<p>Contemplative reasoning with the Lotus Sutra wisdom framework.</p>
<h3>Connect</h3>
<ul>
<li><strong>claude.ai / Claude Desktop:</strong> Add as Connector: <code>${url.origin}/mcp</code></li>
<li><strong>Claude Code:</strong> <code>claude mcp add --transport http lotus-wisdom ${url.origin}/mcp</code></li>
<li><strong>npm:</strong> <code>npx -y lotus-wisdom-mcp</code></li>
</ul>
<p><a href="https://github.com/linxule/lotus-wisdom-mcp">Source on GitHub</a></p>
</body></html>`,
        {
          headers: { "content-type": "text/html" },
        }
      );
    }

    return new Response("Not found", { status: 404 });
  },
};
