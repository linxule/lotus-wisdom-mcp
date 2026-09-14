import assert from "node:assert/strict";
import { test } from "node:test";
import { unstable_dev } from "wrangler";

test("worker serves JSON MCP requests and reconstructs stateless journeys", { timeout: 60_000 }, async () => {
  const worker = await unstable_dev("src/index.ts", {
    config: "wrangler.jsonc",
    local: true,
    ip: "127.0.0.1",
    port: 0,
    persist: false,
    logLevel: "error",
    experimental: { disableExperimentalWarning: true, disableDevRegistry: true },
  });
  let id = 0;
  async function rpc(method, params = {}, path = "/mcp") {
    const response = await worker.fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /application\/json/);
    const message = await response.json();
    assert.equal(message.error, undefined, JSON.stringify(message));
    return message.result;
  }
  try {
    for (const path of ["/mcp", "/mcp/"]) {
      const handshake = await rpc("initialize", {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "worker-regression", version: "1.0.0" },
      }, path);
      assert.equal(handshake.serverInfo.name, "lotus-wisdom");
      assert.equal((await worker.fetch(path)).status, 405);
    }
    const { tools } = await rpc("tools/list");
    assert.deepEqual(tools.map(tool => tool.name).sort(), ["lotuswisdom", "lotuswisdom_summary"]);
    const begin = await rpc("tools/call", {
      name: "lotuswisdom", arguments: { tag: "begin", content: "Starting an inquiry" },
    });
    assert.equal(begin.structuredContent.status, "FRAMEWORK_RECEIVED");
    const step = await rpc("tools/call", {
      name: "lotuswisdom",
      arguments: { tag: "examine", content: "Considering alternatives", stepNumber: 2, totalSteps: 3, previousJourney: "begin" },
    });
    assert.equal(step.structuredContent.journey, "begin → examine");
    const summary = await rpc("tools/call", {
      name: "lotuswisdom_summary", arguments: { previousJourney: step.structuredContent.journey },
    });
    assert.equal(summary.structuredContent.journeyLength, 2);
    const fresh = await rpc("tools/call", { name: "lotuswisdom_summary", arguments: {} });
    assert.equal(fresh.structuredContent.journeyLength, 0);
    const invalid = await rpc("tools/call", { name: "lotuswisdom", arguments: { tag: "examine" } });
    assert.equal(invalid.isError, true);
  } finally {
    await worker.stop();
  }
});
