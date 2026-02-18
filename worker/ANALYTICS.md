# Lotus Wisdom MCP Analytics

Analytics Engine instrumentation for tracking client usage, tool calls, and session patterns.

## Schema (v3 — 2026-02-18)

### Fetch-level (every HTTP request to /mcp)

| Field | Column | Value |
|-------|--------|-------|
| blob1 | client | Parsed from User-Agent (see Client Detection below) |
| blob2 | method | HTTP method (`GET` = SSE connection, `POST` = JSON-RPC call, `DELETE` = session close) |
| blob3 | rpc_method | JSON-RPC method from POST body (e.g., `tools/call`, `initialize`, `tools/list`). Empty for GET/DELETE. |
| blob4 | raw_ua | Raw User-Agent string (truncated to 200 chars) — for discovering unknown clients |
| index | | client name (for per-client query accuracy) |

Note: For POST requests, the fetch-level data point is written inside `ctx.waitUntil()` alongside the body parse, so it captures the JSON-RPC method. For GET/DELETE, it's written synchronously with blob3 empty.

### Tool-level (each JSON-RPC `tools/call` POST)

Extracted from request body via `request.clone()` + `ctx.waitUntil()`.

| Field | Column | Value |
|-------|--------|-------|
| blob1 | tool | `lotuswisdom` or `lotuswisdom_summary` |
| blob2 | tag | Contemplation tag (e.g., `begin`, `examine`, `integrate`) |
| blob3 | domain | Wisdom domain (e.g., `meta_cognitive`, `non_dual_recognition`) |
| blob4 | client | Parsed client name (same as fetch-level blob1) |
| double1 | step_number | Current step in journey |
| double2 | total_steps | Estimated total steps |
| index | | tool name |

## Schema History

Analytics Engine is append-only — old data cannot be updated. When querying across schema versions, filter by timestamp.

| Version | Date | Changes |
|---------|------|---------|
| v1 | 2026-02-18 ~14:00 | Initial. Fetch: blob3=path (always `/mcp`). Tool: blob3=status (`ok`/`error`), blob4=domain. |
| v2 | 2026-02-18 ~14:24 | Added raw UA in fetch blob4. Tool: blob3=domain, blob4=client (blob3/4 swapped vs v1). |
| v3 | 2026-02-18 ~current | Fetch: blob3=JSON-RPC method (replaces constant path). Added `Claude-User` to parseClient. |

**Impact**: ~40 data points exist with v1/v2 schemas. For tool-level queries on old data, blob3 may contain `"ok"` (v1 status) instead of a domain name. Filter with `WHERE timestamp >= '2026-02-18 15:00:00'` to get only v3 data, or accept the noise (it's a small amount).

## Querying (SQL API)

Endpoint: `POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/analytics_engine/sql`

Auth: Bearer token with `Account Analytics Read` permission.

### Client breakdown (equivalent to Smithery "Top Clients")

```sql
SELECT
  blob1 AS client,
  SUM(_sample_interval) AS requests
FROM lotus_wisdom_usage
WHERE timestamp >= NOW() - INTERVAL '7' DAY
  AND blob2 = 'POST'
GROUP BY client
ORDER BY requests DESC
```

### Daily sessions (GET = new SSE connection)

```sql
SELECT
  toDate(timestamp) AS day,
  SUM(_sample_interval) AS sessions
FROM lotus_wisdom_usage
WHERE blob2 = 'GET'
GROUP BY day
ORDER BY day DESC
```

### MCP protocol breakdown (what JSON-RPC methods are called)

```sql
SELECT
  blob3 AS rpc_method,
  blob1 AS client,
  SUM(_sample_interval) AS calls
FROM lotus_wisdom_usage
WHERE blob2 = 'POST'
  AND blob3 != ''
GROUP BY rpc_method, client
ORDER BY calls DESC
```

### Tool usage by tag

```sql
SELECT
  blob2 AS tag,
  blob3 AS domain,
  SUM(_sample_interval) AS calls
FROM lotus_wisdom_usage
WHERE blob1 = 'lotuswisdom'
GROUP BY tag, domain
ORDER BY calls DESC
```

### Discover unknown clients (raw User-Agent strings)

```sql
SELECT
  blob4 AS raw_ua,
  SUM(_sample_interval) AS requests
FROM lotus_wisdom_usage
WHERE blob1 = 'unknown'
  AND blob2 IN ('GET', 'POST')
GROUP BY raw_ua
ORDER BY requests DESC
LIMIT 20
```

### Average journey depth (completed journeys)

```sql
SELECT
  AVG(double1) AS avg_steps
FROM lotus_wisdom_usage
WHERE blob1 = 'lotuswisdom'
  AND (blob2 = 'complete' OR blob2 = 'express')
```

## Limits (Free Tier)

| Resource | Limit |
|----------|-------|
| Data points per Worker invocation | 250 |
| Read queries | 10,000/day |
| Retention | 90 days (no backfill) |
| Blobs per data point | 20 (16 KB total) |
| Doubles per data point | 20 |
| Index size | 96 bytes |
| Indexes per data point | 1 (>1 silently drops the point) |

## Client Detection

Client identification uses `parseClient()` which matches against known User-Agent strings.

| UA pattern | Detected as | Source |
|------------|-------------|--------|
| `Claude-User` (exact) | `claude-ai` | Claude.ai web/desktop app |
| `claude-ai`, `claude.ai` | `claude-ai` | Claude AI variants |
| `claude-code`, `claude code` | `claude-code` | Claude Code CLI |
| `cursor` | `cursor` | Cursor IDE (sends `Cursor/x.x.x (os arch)`) |
| `gemini` | `gemini` | Gemini CLI |
| `windsurf` | `windsurf` | Windsurf IDE |
| `cline` | `cline` | Cline VS Code extension |
| `smithery` | `smithery` | Smithery proxy |
| `mcp-remote` | `mcp-remote` | mcp-remote npm bridge |
| _(none matched)_ | `unknown` | Generic SDK clients |

**MCP SEP-1329** defines a standard UA format (`sdk-name/version (os; language)`) but adoption is minimal as of early 2026. The raw UA is stored in fetch-level `blob4` so unknown clients can be identified and the parser updated.

To improve detection: query the "Discover unknown clients" SQL above periodically, identify new patterns, and add them to `parseClient()`.

## Gotchas

- **Local dev**: `writeDataPoint()` is NOT available in `wrangler dev`. The `track()` helper silently catches errors.
- **Silent failures**: Invalid data (e.g., >1 index) silently drops the data point with no error.
- **Sampling**: At high volume (>100 data points/sec per index value), data is sampled. Use `SUM(_sample_interval)` instead of `COUNT()` for accurate counts.
- **Ordered arrays**: Blob/double positions are fixed. `blob1` is always the first element. Document schema changes in the Schema History table above.
- **No backfill**: Written data cannot be updated or deleted. 90-day hard retention.
- **Dataset auto-created**: No dashboard setup needed. First `writeDataPoint()` call creates the dataset.
- **POST fetch-level inside waitUntil**: For POST requests, the fetch-level data point is written inside the `ctx.waitUntil()` body-parsing promise (so blob3 can include the JSON-RPC method). If body parsing fails, no fetch-level point is written for that POST. GET/DELETE points are always written synchronously.

## Configuration

**wrangler.jsonc** binding:
```jsonc
"analytics_engine_datasets": [
  { "binding": "ANALYTICS", "dataset": "lotus_wisdom_usage" }
]
```

**Env type** in `src/index.ts`:
```typescript
type Env = {
  MCP_OBJECT: DurableObjectNamespace;
  ANALYTICS: AnalyticsEngineDataset;
};
```
