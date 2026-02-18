# Lotus Wisdom MCP Analytics

Analytics Engine instrumentation for tracking client usage, tool calls, and session patterns.

## Schema

### Fetch-level (every HTTP request to /mcp)

| Field | Column | Value |
|-------|--------|-------|
| blob1 | client | Parsed from User-Agent: `claude-ai`, `claude-code`, `cursor`, `gemini`, `windsurf`, `cline`, `smithery`, `mcp-remote`, `unknown` |
| blob2 | method | HTTP method (`GET` = SSE connection, `POST` = tool call) |
| blob3 | path | Request path |
| index | | client name (for per-client query accuracy) |

### Tool-level (each tool invocation)

| Field | Column | Value |
|-------|--------|-------|
| blob1 | tool | `lotuswisdom` or `lotuswisdom_summary` |
| blob2 | tag | Contemplation tag (e.g., `begin`, `examine`, `integrate`) |
| blob3 | status | `ok` or `error` |
| blob4 | domain | Wisdom domain (e.g., `meta_cognitive`, `non_dual_recognition`) |
| double1 | step_number | Current step in journey |
| double2 | total_steps | Estimated total steps |
| double3 | journey_length | Steps completed so far in session |
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
  blob4 AS domain,
  SUM(_sample_interval) AS calls
FROM lotus_wisdom_usage
WHERE blob1 = 'lotuswisdom'
GROUP BY tag, domain
ORDER BY calls DESC
```

### Average journey length

```sql
SELECT
  SUM(double3 * _sample_interval) / SUM(_sample_interval) AS avg_journey_length
FROM lotus_wisdom_usage
WHERE blob1 = 'lotuswisdom'
  AND blob3 = 'ok'
  AND blob2 = 'complete' OR blob2 = 'express'
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
