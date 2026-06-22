import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpHandler } from "agents/mcp";
import journeyHtml from "../../app/dist/mcp-app.html";

// Domain logic, tool/server metadata, and prompts are shared with the local
// stdio server (index.ts) via src/shared/* — single source of truth, no drift.
import {
  getWisdomDomain,
  processThought,
  parsePreviousJourney,
  summarizeJourney,
  structuredContentFor,
} from "../../src/shared/wisdom.js";
import {
  SERVER_INFO,
  SERVER_INSTRUCTIONS,
  RESOURCE_URI,
  EXT_APPS_MIME,
  LOTUS_TOOL_META,
  LOTUS_TOOL_NAME,
  LOTUS_TOOL_TITLE,
  LOTUS_DESCRIPTION,
  SUMMARY_TOOL_NAME,
  SUMMARY_TOOL_TITLE,
  SUMMARY_DESCRIPTION,
  READ_ONLY_ANNOTATIONS,
  lotusInputShape,
  lotusOutputShape,
  summaryInputShape,
  summaryOutputShape,
  ICON_URL,
} from "../../src/shared/tool-defs.js";
import { registerLotusPrompts } from "../../src/shared/prompts.js";
import { parseClient } from "../../src/shared/parse-client.js";
import { VERSION } from "../../src/shared/version.js";

type Env = {
  ANALYTICS: AnalyticsEngineDataset;
};

// --- Analytics helpers ----------------------------------------------------

function track(
  env: Env,
  data: { blobs: string[]; doubles?: number[]; indexes: string[] },
) {
  try {
    env.ANALYTICS?.writeDataPoint(data);
  } catch {}
}

// v4 unified schema — three event types, all indexed on client
// blob1=event, blob2=tag, blob3=domain, blob4=raw_ua
// double1=step_number, double2=total_steps, double3=next_needed (1=yes, 0=no)
function trackRequest(env: Env, ctx: ExecutionContext, request: Request) {
  const rawUA = request.headers.get("user-agent") ?? "";
  const client = parseClient(rawUA);
  const truncUA = rawUA.substring(0, 200);

  if (request.method === "GET") {
    // Session event: GET attempt (now returns 405, still tracked).
    track(env, {
      blobs: ["session", "", "", truncUA],
      indexes: [client],
    });
    return;
  }

  if (request.method !== "POST") return; // skip DELETE etc.

  const cloned = request.clone();
  ctx.waitUntil(
    cloned
      .json()
      .then((body: any) => {
        if (body?.method !== "tools/call" || !body?.params?.name) return;

        const toolName = body.params.name;
        const args = body.params.arguments ?? {};

        if (toolName === LOTUS_TOOL_NAME) {
          const tag = args.tag ?? "";
          track(env, {
            blobs: ["step", tag, tag ? getWisdomDomain(tag) : "", truncUA],
            doubles: [
              args.stepNumber ?? 0,
              args.totalSteps ?? 0,
              args.nextStepNeeded === false ? 0 : 1,
            ],
            indexes: [client],
          });
        } else if (toolName === SUMMARY_TOOL_NAME) {
          track(env, {
            blobs: ["summary", "", "", truncUA],
            indexes: [client],
          });
        }
      })
      .catch(() => {}),
  );
}

// =============================================================================
// Server factory — fresh McpServer per request; journey state is client-driven
// via previousJourney (stateless).
// =============================================================================

function createWisdomServer(): McpServer {
  const server = new McpServer(SERVER_INFO, {
    instructions: SERVER_INSTRUCTIONS,
  });

  // Advertise ext-apps UI support.
  server.server.registerCapabilities({
    extensions: { "io.modelcontextprotocol/ui": {} },
  } as any);

  // Ext-apps UI resource.
  server.resource(
    RESOURCE_URI,
    RESOURCE_URI,
    {
      mimeType: EXT_APPS_MIME,
      description: "Interactive visualization of the contemplative journey",
    },
    async () => ({
      contents: [
        { uri: RESOURCE_URI, mimeType: EXT_APPS_MIME, text: journeyHtml },
      ],
    }),
  );

  // Tool: lotuswisdom — stateless; processThought reconstructs from
  // previousJourney internally when no in-process state is supplied.
  server.registerTool(
    LOTUS_TOOL_NAME,
    {
      title: LOTUS_TOOL_TITLE,
      description: LOTUS_DESCRIPTION,
      inputSchema: lotusInputShape,
      outputSchema: lotusOutputShape,
      annotations: { title: LOTUS_TOOL_TITLE, ...READ_ONLY_ANNOTATIONS },
      _meta: LOTUS_TOOL_META,
    },
    async (input) => {
      try {
        const { result } = processThought(input, []);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
          structuredContent: structuredContentFor(result),
          _meta: LOTUS_TOOL_META,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  status: "failed",
                  error:
                    error instanceof Error ? error.message : String(error),
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool: lotuswisdom_summary
  server.registerTool(
    SUMMARY_TOOL_NAME,
    {
      title: SUMMARY_TOOL_TITLE,
      description: SUMMARY_DESCRIPTION,
      inputSchema: summaryInputShape,
      outputSchema: summaryOutputShape,
      annotations: { title: SUMMARY_TOOL_TITLE, ...READ_ONLY_ANNOTATIONS },
    },
    async (input) => {
      const result = summarizeJourney(
        parsePreviousJourney(input.previousJourney),
      );
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
        structuredContent: result,
      };
    },
  );

  // MCP Prompts — guided contemplative-session entry points.
  registerLotusPrompts(server);

  return server;
}

// =============================================================================
// Worker fetch handler — stateless JSON-only Streamable HTTP
// =============================================================================

const ICON_CACHE_TTL = 604800; // 7 days

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

      // IMPORTANT: a fresh McpServer MUST be created per request. `agents`
      // bundles its own @modelcontextprotocol/sdk copy, so its McpServer class
      // differs nominally from ours — the `instanceof McpServer` "already
      // connected" guard inside createMcpHandler is inert across the two copies.
      // A fresh per-request server keeps that a non-issue. The cast bridges the
      // nominal type gap; WorkerTransport satisfies our SDK's Transport
      // interface structurally. (Real fix: agents shipping our SDK version.)
      const server = createWisdomServer();
      const handler = createMcpHandler(
        server as unknown as Parameters<typeof createMcpHandler>[0],
        { enableJsonResponse: true },
      );
      return handler(request, env, ctx);
    }

    // Serve the icon as same-origin bytes (edge-cached) so clients/crawlers get
    // a real image at a stable URL rather than a cross-origin redirect.
    if (
      url.pathname === "/icon.png" ||
      url.pathname === "/favicon.png" ||
      url.pathname === "/favicon.ico"
    ) {
      let upstream: Response | null = null;
      try {
        upstream = await fetch(ICON_URL, {
          cf: { cacheTtl: ICON_CACHE_TTL, cacheEverything: true },
          signal: AbortSignal.timeout(3000),
        } as RequestInit);
      } catch {
        upstream = null;
      }
      if (!upstream || !upstream.ok) {
        // Last resort: redirect to the canonical asset. The client's network
        // path to GitHub differs from the Worker's, so this can still resolve;
        // degrades to the pre-v0.8 redirect behavior.
        return Response.redirect(ICON_URL, 302);
      }
      return new Response(upstream.body, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "cache-control": `public, max-age=${ICON_CACHE_TTL}`,
        },
      });
    }

    // Landing page (HTML so a favicon crawler finds the <link rel="icon">).
    if (url.pathname === "/" || url.pathname === "") {
      return new Response(
        `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Lotus Wisdom MCP</title>
<link rel="icon" type="image/png" href="/icon.png">
</head><body style="font-family:system-ui;max-width:520px;margin:40px auto;color:#333">
<h1>Lotus Wisdom MCP Server v${VERSION}</h1>
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
        },
      );
    }

    return new Response("Not found", { status: 404 });
  },
};
