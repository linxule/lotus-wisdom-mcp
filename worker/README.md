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
- No auth (public) - add Cloudflare Access or OAuth if needed

## Free tier limits

- 100K Worker requests/day
- 100K Durable Object requests/day
- 5GB Durable Object storage
- 10ms CPU per Worker request (Durable Object gets 30s)
