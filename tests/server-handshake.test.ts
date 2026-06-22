// Integration test crossing the transport <-> shared-module boundary: drives the
// real McpServer (from index.ts's createServer factory) over an in-memory
// transport and asserts the full handshake. createServer shares its entire tool/
// prompt/instruction surface with the Worker via src/shared, so this guards both.
import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import createServer from "../index";

async function connect() {
  const server = createServer();
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "handshake-test", version: "0.0.0" });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return client;
}

describe("MCP handshake (in-memory)", () => {
  it("advertises serverInfo, instructions, and tool+prompt capabilities", async () => {
    const client = await connect();
    expect(client.getServerVersion()?.name).toBe("lotus-wisdom");
    const caps = client.getServerCapabilities();
    expect(caps?.tools).toBeDefined();
    expect(caps?.prompts).toBeDefined();
    expect(client.getInstructions() ?? "").toContain("lotuswisdom");
  });

  it("lists both tools with read-only annotations and an output schema", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(["lotuswisdom", "lotuswisdom_summary"]);
    for (const t of tools) {
      expect(t.annotations?.readOnlyHint).toBe(true);
      expect(t.outputSchema).toBeDefined();
    }
  });

  it("lists the contemplative prompts", async () => {
    const client = await connect();
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name).sort()).toEqual([
      "contemplate",
      "deep-inquiry",
    ]);
  });

  it("calls lotuswisdom begin -> FRAMEWORK_RECEIVED with flattened structuredContent", async () => {
    const client = await connect();
    const res = await client.callTool({
      name: "lotuswisdom",
      arguments: {
        tag: "begin",
        content: "x",
        stepNumber: 1,
        totalSteps: 3,
        nextStepNeeded: true,
      },
    });
    const sc = res.structuredContent as Record<string, unknown>;
    expect(sc.status).toBe("FRAMEWORK_RECEIVED");
    // begin's nested framework must NOT ride along in structuredContent
    expect(sc.philosophy).toBeUndefined();
    expect(sc.domains).toBeUndefined();
  });

  it("returns an isError result for a call missing required content", async () => {
    const client = await connect();
    const res = await client.callTool({
      name: "lotuswisdom",
      arguments: {
        tag: "examine",
        stepNumber: 2,
        totalSteps: 3,
        nextStepNeeded: true,
      },
    });
    expect(res.isError).toBe(true);
  });
});
