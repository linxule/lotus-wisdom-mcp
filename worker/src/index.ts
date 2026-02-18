import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

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

interface LotusState {
  thoughtProcess: LotusThoughtData[];
}

// --- Framework text returned on tag='begin' ---

function buildFrameworkResponse() {
  return {
    status: "FRAMEWORK_RECEIVED",
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
      response: JSON.stringify(buildFrameworkResponse(), null, 2),
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

  // Wisdom ready (express or complete, final step)
  if (
    (input.tag === "express" || input.tag === "complete") &&
    !input.nextStepNeeded
  ) {
    const { journey, domainJourney } = buildJourney(thoughtProcess);
    return {
      response: JSON.stringify(
        {
          status: "WISDOM_READY",
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

// --- Cloudflare Worker: McpAgent with Durable Object state ---

type Env = {
  MCP_OBJECT: DurableObjectNamespace;
  ANALYTICS: AnalyticsEngineDataset;
};

// --- Analytics helpers ---

function track(env: Env, data: { blobs: string[]; doubles?: number[]; indexes: string[] }) {
  try { env.ANALYTICS?.writeDataPoint(data); } catch {}
}

function parseClient(ua: string): string {
  const lower = ua.toLowerCase();
  if (lower.includes("claude-ai") || lower.includes("claude.ai")) return "claude-ai";
  if (lower.includes("claude-code") || lower.includes("claude code")) return "claude-code";
  if (lower.includes("cursor")) return "cursor";
  if (lower.includes("gemini")) return "gemini";
  if (lower.includes("windsurf")) return "windsurf";
  if (lower.includes("cline")) return "cline";
  if (lower.includes("smithery")) return "smithery";
  if (lower.includes("mcp-remote")) return "mcp-remote";
  return "unknown";
}

function trackRequest(env: Env, ctx: ExecutionContext, request: Request, url: URL) {
  const rawUA = request.headers.get("user-agent") ?? "";
  const client = parseClient(rawUA);
  const method = request.method;

  // Always track the request (blob4 = raw UA for discovering unknown clients)
  track(env, {
    blobs: [client, method, url.pathname, rawUA.substring(0, 200)],
    indexes: [client],
  });

  // For POST requests, try to extract tool call info from JSON-RPC body
  if (method === "POST") {
    const cloned = request.clone();
    ctx.waitUntil(
      cloned.json().then((body: any) => {
        if (body?.method === "tools/call" && body?.params?.name) {
          const toolName = body.params.name;
          const args = body.params.arguments ?? {};
          const tag = args.tag ?? "";
          const domain = tag ? getWisdomDomain(tag) : "";
          track(env, {
            blobs: [toolName, tag, domain, client],
            doubles: [args.stepNumber ?? 0, args.totalSteps ?? 0],
            indexes: [toolName],
          });
        }
      }).catch(() => {})
    );
  }
}

export class LotusWisdomMCP extends McpAgent<Env, LotusState, {}> {
  server = new McpServer({
    name: "lotus-wisdom",
    version: "0.3.2",
  });

  initialState: LotusState = {
    thoughtProcess: [],
  };

  async init() {
    // Tool: lotuswisdom
    this.server.tool(
      "lotuswisdom",
      `Contemplative reasoning tool. Use for complex problems needing multi-perspective understanding, contradictions requiring integration, or questions holding their own wisdom.

**Workflow:** Always start with tag='begin' (returns framework). Then continue with contemplation tags. Do NOT output wisdom until status='WISDOM_READY'.

**Tags:** begin (FIRST - receives framework), then: open/engage/express (process), examine/reflect/verify/refine/complete (meta-cognitive), recognize/transform/integrate/transcend/embody (non-dual), upaya/expedient/direct/gradual/sudden (skillful-means), meditate (pause).`,
      {
        tag: z.enum(CORE_TAGS as [string, ...string[]]),
        content: z.string().default("Beginning contemplative journey"),
        stepNumber: z.number().int().min(1).default(1),
        totalSteps: z.number().int().min(1).default(5),
        nextStepNeeded: z.boolean().default(true),
        isMeditation: z.boolean().optional(),
        meditationDuration: z.number().int().min(1).max(10).optional(),
      },
      async (input) => {
        try {
          const result = processThought(input, this.state.thoughtProcess);
          this.setState({ thoughtProcess: result.thoughtProcess });
          return { content: [{ type: "text" as const, text: result.response }] };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    error:
                      error instanceof Error ? error.message : String(error),
                    status: "failed",
                  },
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
    this.server.tool(
      "lotuswisdom_summary",
      "Get a summary of the current contemplative journey",
      {},
      async () => {
        const steps = this.state.thoughtProcess;
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
  }
}

// --- Worker fetch handler ---

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/mcp" || url.pathname === "/mcp/") {
      trackRequest(env, ctx, request, url);
      return LotusWisdomMCP.serve("/mcp").fetch(request, env, ctx);
    }

    // Landing page
    if (url.pathname === "/" || url.pathname === "") {
      return new Response(
        `Lotus Wisdom MCP Server v0.3.2

Connect via MCP client:
  URL: ${url.origin}/mcp

For Claude Desktop / Cursor / etc:
  npx mcp-remote ${url.origin}/mcp

Source: https://github.com/linxule/lotus-wisdom-mcp
`,
        {
          headers: { "content-type": "text/plain" },
        }
      );
    }

    return new Response("Not found", { status: 404 });
  },
};
