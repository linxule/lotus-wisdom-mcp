# Lotus Wisdom MCP

Contemplative reasoning MCP server implementing the Lotus Wisdom framework. Two deployment modes: local stdio (npm package) and remote Cloudflare Worker.

## Architecture

```
lotus-wisdom-mcp/
├── index.ts              # Local stdio server (npm package entry)
├── server.ts             # Express-based SSE server (legacy)
├── worker/               # Cloudflare Worker deployment
│   ├── src/index.ts      # McpAgent + Durable Objects + Analytics
│   ├── wrangler.jsonc    # Worker config (bindings, migrations)
│   ├── ANALYTICS.md      # Analytics Engine schema + query reference
│   └── README.md         # Worker-specific deploy/connect docs
├── dist/                 # Built npm package output
├── .smithery/            # Smithery hosting config
└── package.json          # npm package (v0.3.2)
```

## Two deployment targets

| Target | Entry | Transport | State |
|--------|-------|-----------|-------|
| **npm/stdio** | `index.ts` → `dist/bundle.js` | stdio | In-memory (per-process) |
| **Cloudflare Worker** | `worker/src/index.ts` | Streamable HTTP / SSE | Durable Objects (persistent) |

Both share the same wisdom domain logic but the Worker version uses `McpAgent` from the `agents` SDK with Durable Object session state.

## Cloudflare Worker

### Deploy

```bash
cd worker
bun install
bunx wrangler deploy
```

Live at: `https://lotus-wisdom-mcp.linxule.workers.dev/mcp`

### Bindings

| Binding | Type | Purpose |
|---------|------|---------|
| `MCP_OBJECT` | Durable Object | Session state (thought journey) |
| `ANALYTICS` | Analytics Engine | Usage telemetry (`lotus_wisdom_usage` dataset) |

### Analytics

Lightweight telemetry via Cloudflare Analytics Engine (v4 schema). Three event types:
- **session**: new SSE connection (GET)
- **step**: lotuswisdom tool call with tag, domain, step/total counts, nextStepNeeded
- **summary**: lotuswisdom_summary tool call

Protocol noise (initialize, tools/list, notifications) is not tracked. All events indexed on client name parsed from User-Agent. See `worker/ANALYTICS.md` for full schema, SQL queries, and gotchas.

Key implementation details:
- `writeDataPoint()` is fire-and-forget (no await needed per CF docs)
- JSON body parsing for tool-level tracking uses `ctx.waitUntil()` to prevent isolate termination
- `request.clone()` used to read body without consuming it before passing to McpAgent
- Analytics Engine is NOT available in `wrangler dev` (silently no-ops)

### Query analytics

```bash
# Set up
ACCOUNT_ID="d220e894d56a248e0c96daebefec28b4"
TOKEN=$(grep oauth_token ~/Library/Preferences/.wrangler/config/default.toml | head -1 | sed 's/.*= *"//;s/".*//')

# Client breakdown (v4 schema)
curl -s "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/analytics_engine/sql" \
  -H "Authorization: Bearer $TOKEN" \
  -d "SELECT index1 AS client, SUM(_sample_interval) AS events FROM lotus_wisdom_usage WHERE blob1 IN ('session','step','summary') GROUP BY client ORDER BY events DESC"
```

See `worker/ANALYTICS.md` for more queries.

## npm package (local stdio)

```bash
bun install
bun run build        # tsc + esbuild → dist/bundle.js
bun run start        # run local stdio server
```

Published as `lotus-wisdom-mcp` on npm. Users install via `npx -y lotus-wisdom-mcp`.

## Common tasks

### Update wisdom domain logic
Both `index.ts` (local) and `worker/src/index.ts` (remote) contain the domain logic. Changes must be synced manually. The canonical types are `WISDOM_DOMAINS`, `CORE_TAGS`, `LotusThoughtData`, and `processThought()`.

### Add a new MCP client to parseClient()
Edit `worker/src/index.ts` `parseClient()` function. Check raw UAs first:
```sql
SELECT blob4 AS raw_ua, SUM(_sample_interval) AS n
FROM lotus_wisdom_usage WHERE index1 = 'unknown' AND blob1 IN ('session','step')
GROUP BY raw_ua ORDER BY n DESC
```

### Redeploy worker
```bash
cd worker && bunx wrangler deploy
```

### Tail worker logs
```bash
cd worker && bunx wrangler tail
```

## Distribution

- **npm**: `npx -y lotus-wisdom-mcp` (stdio)
- **Cloudflare Worker**: `https://lotus-wisdom-mcp.linxule.workers.dev/mcp` (HTTP)
- **Smithery**: proxied via `smithery.yaml` config
- **MCP Registry**: registered via `server.json` with `mcpName: io.github.linxule/lotus-wisdom`

## Free tier limits

| Resource | Limit |
|----------|-------|
| Worker requests | 100K/day |
| Durable Object requests | 100K/day |
| DO storage | 5GB |
| Analytics Engine writes | 100K/day |
| Analytics Engine reads | 10K/day |
| Analytics retention | 90 days |
