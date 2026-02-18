# Lotus Wisdom MCP Analytics

Analytics Engine instrumentation for tracking client usage, tool calls, and session patterns.

## Schema

### Fetch-level (every HTTP request to /mcp)

| Field | Column | Value |
|-------|--------|-------|
| blob1 | client | Parsed from User-Agent: `claude-ai`, `claude-code`, `cursor`, `gemini`, `windsurf`, `cline`, `smithery`, `mcp-remote`, `unknown` |
| blob2 | method | HTTP method (`GET` = SSE connection, `POST` = tool call) |
| blob3 | path | Request path |
| blob4 | raw_ua | Raw User-Agent string (truncated to 200 chars) — for discovering unknown clients |
| index | | client name (for per-client query accuracy) |

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
| Data points written | 100,000/day |
| Read queries | 10,000/day |
| Retention | 90 days |
| Blobs per data point | 20 |
| Doubles per data point | 20 |
| Index size | 96 bytes |

## Client Detection

Client identification uses `parseClient()` which matches against known User-Agent substrings. Most MCP clients (Claude Desktop, Cursor, Cline, etc.) currently send generic UA strings (`node-fetch`, `python-httpx`), so many appear as "unknown".

**MCP SEP-1329** defines a standard UA format (`sdk-name/version (os; language)`) but adoption is minimal as of early 2026. The raw UA is stored in fetch-level `blob4` so unknown clients can be identified and the parser updated.

**Known clients**: `claude-ai`, `claude-code`, `cursor`, `gemini`, `windsurf`, `cline`, `smithery`, `mcp-remote`.

To improve detection: query the "Discover unknown clients" SQL above periodically, identify new patterns, and add them to `parseClient()`.

## Gotchas

- **Local dev**: `writeDataPoint()` is NOT available in `wrangler dev`. The `track()` helper silently catches errors.
- **Silent failures**: Invalid data (e.g., >1 index) silently drops the data point with no error.
- **Sampling**: At high volume (>100 data points/sec per index value), data is sampled. Use `SUM(_sample_interval)` instead of `COUNT()` for accurate counts.
- **Ordered arrays**: Blob/double positions are fixed. `blob1` is always the first element. Document schema changes here.
- **No backfill**: Written data cannot be updated or deleted. 90-day hard retention.
- **Dataset auto-created**: No dashboard setup needed. First `writeDataPoint()` call creates the dataset.

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
