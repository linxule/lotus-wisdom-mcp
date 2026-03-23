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

- Uses `createMcpHandler` from the `agents` SDK for Streamable HTTP handling
- Fully stateless Streamable HTTP server with JSON responses only
- Journey continuity is client-driven via the `previousJourney` parameter
- `GET /mcp` is intentionally rejected — the server does not emit server-initiated notifications
- Public endpoint intended for remote MCP registries and clients

## Analytics

Usage telemetry via Cloudflare Analytics Engine. See [ANALYTICS.md](./ANALYTICS.md) for schema, queries, and implementation details.

## Free tier limits

- 100K Worker requests/day
- 10ms CPU per Worker request
- 100K Analytics Engine writes/day
- 10K Analytics Engine reads/day
- 90-day Analytics Engine retention

**Note**: Wall time should remain close to CPU time because `/mcp` no longer holds open SSE sessions.
