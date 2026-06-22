#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import {
  type LotusThoughtData,
  processThought,
  parsePreviousJourney,
  summarizeJourney,
  structuredContentFor,
} from "./src/shared/wisdom.js";
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
} from "./src/shared/tool-defs.js";
import { registerLotusPrompts } from "./src/shared/prompts.js";
import { VERSION } from "./src/shared/version.js";

// Load the journey-visualization HTML for the ext-apps UI. Bundled into dist/
// by the build; absent in plain `tsc` dev mode (the UI resource is then skipped).
const __dirname = dirname(fileURLToPath(import.meta.url));
let journeyHtml = "";
try {
  journeyHtml = readFileSync(join(__dirname, "journey.html"), "utf-8");
} catch {}
try {
  if (!journeyHtml)
    journeyHtml = readFileSync(join(__dirname, "app", "journey.html"), "utf-8");
} catch {}

const debug = process.env.LOTUS_DEBUG === "true";

// Factory function — also used as the Smithery deployment entry point.
export default function createServer() {
  const server = new McpServer(SERVER_INFO, {
    instructions: SERVER_INSTRUCTIONS,
  });

  // The stdio transport hosts a single contemplative session, so the journey
  // is accumulated in-process across tool calls.
  let thoughtProcess: LotusThoughtData[] = [];

  // Ext-apps UI resource — registered only when the built HTML is available.
  if (journeyHtml) {
    server.server.registerCapabilities({
      extensions: { "io.modelcontextprotocol/ui": {} },
    } as any);

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
  }

  // Tool: lotuswisdom
  server.registerTool(
    LOTUS_TOOL_NAME,
    {
      title: LOTUS_TOOL_TITLE,
      description: LOTUS_DESCRIPTION,
      inputSchema: lotusInputShape,
      outputSchema: lotusOutputShape,
      annotations: { title: LOTUS_TOOL_TITLE, ...READ_ONLY_ANNOTATIONS },
      ...(journeyHtml ? { _meta: LOTUS_TOOL_META } : {}),
    },
    async (input) => {
      try {
        const { result, thoughtProcess: next } = processThought(
          input,
          thoughtProcess,
        );
        thoughtProcess = next;
        if (debug)
          console.error(
            `[lotus] ${input.tag} (step ${input.stepNumber}) -> ${result.status}`,
          );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
          structuredContent: structuredContentFor(result),
          ...(journeyHtml ? { _meta: LOTUS_TOOL_META } : {}),
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
      // Prefer in-process state; fall back to previousJourney reconstruction
      // for parity with the stateless Worker transport.
      const steps =
        thoughtProcess.length > 0
          ? thoughtProcess
          : parsePreviousJourney(input.previousJourney);
      const result = summarizeJourney(steps);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  // MCP Prompts — guided contemplative-session entry points.
  registerLotusPrompts(server);

  return server;
}

// STDIO mode (npx, local dev, Claude Code)
async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Lotus Wisdom MCP Server v${VERSION} running`);
}

// Only run stdio when executed directly (not when imported by Smithery CLI).
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith("bundle.js") ||
    process.argv[1].endsWith("index.js") ||
    process.argv[1].endsWith("index.ts") ||
    process.argv[1].endsWith("cli.js"));
if (isDirectRun) {
  main().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
  });
}
