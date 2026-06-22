# Lotus Wisdom - Cloudflare Worker

Remote MCP server deployment of Lotus Wisdom on Cloudflare Workers — a fully stateless Streamable HTTP endpoint (no Durable Objects, no SSE).

## Deploy

```bash
cd worker
bun install
bunx wrangler deploy
```

Your server will be at `https://lotus-wisdom-mcp.<account>.workers.dev/mcp`.

## Connect

Any MCP client supporting Streamable HTTP can connect directly to the `/mcp` URL (the server replies with JSON, not SSE). For Claude clients:

```bash
# Claude Code
claude mcp add --transport http lotus-wisdom https://lotus-wisdom-mcp.<account>.workers.dev/mcp
```

claude.ai and Claude Desktop add it as a Connector using the same `/mcp` URL.

For clients that only support stdio, use `mcp-remote`:

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

- **Stateless per request**: every POST `/mcp` creates a fresh `McpServer` (via `createMcpHandler` from the `agents` SDK, `enableJsonResponse: true`) — no session state is held on the server
- **Client-driven continuity**: journey continuity is carried by the optional `previousJourney` tool parameter rather than server-side sessions
- **Shared logic**: tools, schemas, prompts, and domain logic are imported from `../../src/shared/*` — identical to the local stdio server, no drift
- **`GET /mcp` returns 405**: the server emits no server-initiated notifications, so there is no SSE stream to open
- **Branding in the handshake**: the initialize response advertises the server icon and `websiteUrl` (from `SERVER_INFO`)
- **`/icon.png`** (also `/favicon.png`, `/favicon.ico`): serves the lotus logo as same-origin, edge-cached PNG bytes (falling back to a redirect only if the upstream asset is unavailable), so clients and favicon crawlers get a real image at a stable URL
- **`/`**: a small HTML landing page with connect instructions and a `<link rel="icon">`
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
