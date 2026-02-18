# Lotus Wisdom MCP Analytics

Analytics Engine instrumentation for tracking client usage, tool calls, and session patterns.

## Schema (v4 — 2026-02-18)

Unified schema with three event types, all indexed on client name.

### Event types

| Event | Trigger | Description |
|-------|---------|-------------|
| `session` | GET /mcp | New SSE connection (one per client session) |
| `step` | `tools/call` lotuswisdom | Contemplation step (begin, examine, express, etc.) |
| `summary` | `tools/call` lotuswisdom_summary | Journey summary request |

### Field mapping

| Position | Name | `session` | `step` | `summary` |
|----------|------|-----------|--------|-----------|
| index | client | `claude-ai` | `claude-ai` | `claude-ai` |
| blob1 | event | `"session"` | `"step"` | `"summary"` |
| blob2 | tag | _(empty)_ | `"examine"` | _(empty)_ |
| blob3 | domain | _(empty)_ | `"meta_cognitive"` | _(empty)_ |
| blob4 | raw_ua | `"Claude-User"` | `"Claude-User"` | `"Claude-User"` |
| double1 | step_number | _(absent)_ | 2 | _(absent)_ |
| double2 | total_steps | _(absent)_ | 5 | _(absent)_ |
| double3 | next_needed | _(absent)_ | 1=yes, 0=no | _(absent)_ |

**Note**: Absent doubles coerce to `0` in SQL queries. Always filter `WHERE blob1 = 'step'` before querying doubles to avoid matching session/summary events.

**Key**: `double3` tracks `nextStepNeeded`. A step event with `blob2 IN ('express','complete')` and `double3=0` marks a completed journey.

### What's NOT tracked (v4 change)

Protocol noise is dropped entirely — no data points for `initialize`, `tools/list`, `notifications/*`, or `DELETE`. This reduces ~10+ data points per session to ~5-7 meaningful events.

## Schema History

Analytics Engine is append-only — old data cannot be updated. When querying across schema versions, filter by timestamp.

| Version | Date | Changes |
|---------|------|---------|
| v1 | 2026-02-18 ~14:00 | Initial. Fetch: blob3=path (always `/mcp`). Tool: blob3=status (`ok`/`error`), blob4=domain. |
| v2 | 2026-02-18 ~14:24 | Added raw UA in fetch blob4. Tool: blob3=domain, blob4=client (blob3/4 swapped vs v1). |
| v3 | 2026-02-18 ~15:00 | Fetch: blob3=JSON-RPC method. Added `Claude-User` to parseClient. Two data point types (fetch-level + tool-level). |
| v4 | 2026-02-18 ~current | Unified schema. Dropped protocol noise (initialize, tools/list, DELETE). Three event types: session, step, summary. Added double3 (nextStepNeeded). All events indexed on client. |

**Impact**: ~100 data points exist with v1-v3 schemas. For clean v4 queries, filter with `WHERE blob1 IN ('session','step','summary')`. Old fetch-level rows have blob1=client name (not event type) so they're naturally excluded.

## Querying (SQL API)

Endpoint: `POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/analytics_engine/sql`

Auth: Bearer token with `Account Analytics Read` permission.

### Client breakdown

```sql
SELECT
  index1 AS client,
  SUM(_sample_interval) AS events
FROM lotus_wisdom_usage
WHERE blob1 IN ('session', 'step', 'summary')
  AND timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY client
ORDER BY events DESC
```

### Daily sessions

```sql
SELECT
  toDate(timestamp) AS day,
  SUM(_sample_interval) AS sessions
FROM lotus_wisdom_usage
WHERE blob1 = 'session'
GROUP BY day
ORDER BY day DESC
```

### Tool usage by tag and domain

```sql
SELECT
  blob2 AS tag,
  blob3 AS domain,
  SUM(_sample_interval) AS calls
FROM lotus_wisdom_usage
WHERE blob1 = 'step'
GROUP BY tag, domain
ORDER BY calls DESC
```

### Completed journeys (express/complete with nextStepNeeded=false)

```sql
SELECT
  index1 AS client,
  blob2 AS final_tag,
  AVG(double1) AS avg_final_step,
  SUM(_sample_interval) AS completions
FROM lotus_wisdom_usage
WHERE blob1 = 'step'
  AND blob2 IN ('express', 'complete')
  AND double3 = 0
GROUP BY client, final_tag
ORDER BY completions DESC
```

### Average journey depth

```sql
SELECT
  AVG(double1) AS avg_steps,
  AVG(double2) AS avg_estimated_total
FROM lotus_wisdom_usage
WHERE blob1 = 'step'
  AND blob2 IN ('express', 'complete')
  AND double3 = 0
```

### Step progression (how journeys flow)

```sql
SELECT
  double1 AS step_number,
  blob2 AS tag,
  SUM(_sample_interval) AS count
FROM lotus_wisdom_usage
WHERE blob1 = 'step'
GROUP BY step_number, tag
ORDER BY step_number, count DESC
```

### Discover unknown clients

```sql
SELECT
  blob4 AS raw_ua,
  SUM(_sample_interval) AS requests
FROM lotus_wisdom_usage
WHERE index1 = 'unknown'
  AND blob1 IN ('session', 'step')
GROUP BY raw_ua
ORDER BY requests DESC
LIMIT 20
```

### Summary tool usage (who uses it)

```sql
SELECT
  index1 AS client,
  SUM(_sample_interval) AS summary_calls
FROM lotus_wisdom_usage
WHERE blob1 = 'summary'
GROUP BY client
ORDER BY summary_calls DESC
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

**MCP SEP-1329** defines a standard UA format (`sdk-name/version (os; language)`) but adoption is minimal as of early 2026. The raw UA is stored in `blob4` so unknown clients can be identified and the parser updated.

To improve detection: query the "Discover unknown clients" SQL above periodically, identify new patterns, and add them to `parseClient()`.

## Gotchas

- **Local dev**: `writeDataPoint()` is NOT available in `wrangler dev`. The `track()` helper silently catches errors.
- **Silent failures**: Invalid data (e.g., >1 index) silently drops the data point with no error.
- **Sampling**: At high volume (>100 data points/sec per index value), data is sampled. Use `SUM(_sample_interval)` instead of `COUNT()` for accurate counts.
- **Ordered arrays**: Blob/double positions are fixed. `blob1` is always the first element. Document schema changes in the Schema History table above.
- **No backfill**: Written data cannot be updated or deleted. 90-day hard retention.
- **Dataset auto-created**: No dashboard setup needed. First `writeDataPoint()` call creates the dataset.
- **POST body parsing**: Tool-level tracking uses `request.clone()` + `ctx.waitUntil()` for JSON body parsing. `writeDataPoint()` itself is fire-and-forget (no await needed), but the `.json()` call preceding it needs `ctx.waitUntil()` to prevent isolate termination.
- **nextStepNeeded encoding**: `double3` stores 1 for `true` (journey continues) and 0 for `false` (journey complete). Default is 1 so missing values don't look like completions.

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
