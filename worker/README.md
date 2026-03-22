# Lotus Wisdom - Cloudflare Worker

Remote MCP server deployment of Lotus Wisdom on Cloudflare Workers with Durable Objects for session state.

## Deploy

```bash
cd worker
bun install
bunx wrangler deploy
```

Your server will be at `https://lotus-wisdom-mcp.<account>.workers.dev/mcp`.

## Connect

Any MCP client supporting Streamable HTTP or SSE can connect directly to the `/mcp` URL.

For clients that only support stdio (Claude Desktop, etc.), use `mcp-remote`:

```json
{
  "mcpServers": {
    "lotus-wisdom": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://lotus-wisdom-mcp.<account>.workers.dev/mcp"]
    }
  }
}
```

## Local dev

```bash
bunx wrangler dev
```

Server runs at `http://localhost:8787/mcp`.

## Architecture

- Uses `McpAgent` from `agents` SDK (Cloudflare's official MCP framework)
- Session state (thought journey) persisted via Durable Objects
- Each MCP session gets its own Durable Object instance
- **Idle timeout (5 min)**: SSE streams are auto-closed after 5 minutes of inactivity via DO alarms, preventing runaway wall-time billing from long-lived connections
- **Stateless fallback**: If the DO is unavailable (free tier duration exceeded, or any exception), the Worker falls back to stateless mode — tools still work via `previousJourney` param, only `lotuswisdom_summary` loses state
- No auth (public) - add Cloudflare Access or OAuth if needed

## Analytics

Usage telemetry via Cloudflare Analytics Engine. See [ANALYTICS.md](./ANALYTICS.md) for schema, queries, and implementation details.

## Free tier limits

- 100K Worker requests/day
- 100K Durable Object requests/day
- Durable Object duration: 2,147,483,647ms/day (wall time across all DOs)
- 5GB Durable Object storage
- 10ms CPU per Worker request (Durable Object gets 30s)
- 100K Analytics Engine writes/day
- 10K Analytics Engine reads/day
- 90-day Analytics Engine retention

**Note**: DO duration (wall time) is the binding constraint — SSE connections keep DOs alive even when idle. The 5-minute idle timeout prevents this from exhausting the daily limit.
