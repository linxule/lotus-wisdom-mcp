# Lotus Wisdom MCP Analytics

Analytics Engine instrumentation for tracking client usage, tool-call requests, and attempted streaming connections.

## Schema (v4 — 2026-02-18)

Unified schema with three event types, all indexed on client name.

### Event types

| Event | Trigger | Description |
|-------|---------|-------------|
| `session` | GET /mcp or /mcp/ | Legacy event name for a GET attempt; the stateless worker returns 405 and opens no session |
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

**Key**: `double3` records the submitted `nextStepNeeded` flag. Normal steps can return `WISDOM_READY` with any valid tag when that flag is false; `begin` and meditation steps have separate response paths. These events are recorded before tool validation and do not include the `isMeditation` flag or result status, so completion-request counts do not prove successful completion. Missing step numbers and total counts are recorded as `0`, before schema defaults are applied.

### What's NOT tracked (v4 change)

Protocol noise is dropped entirely — no data points for `initialize`, `tools/list`, `notifications/*`, or `DELETE`.

## Schema History

Analytics Engine is append-only — old data cannot be updated. When querying across schema versions, filter by timestamp.

| Version | Date | Changes |
|---------|------|---------|
| v1 | 2026-02-18 ~14:00 | Initial. Fetch: blob3=path (always `/mcp`). Tool: blob3=status (`ok`/`error`), blob4=domain. |
| v2 | 2026-02-18 ~14:24 | Added raw UA in fetch blob4. Tool: blob3=domain, blob4=client (blob3/4 swapped vs v1). |
| v3 | 2026-02-18 ~15:00 | Fetch: blob3=JSON-RPC method. Added `Claude-User` to parseClient. Two data point types (fetch-level + tool-level). |
| v4 | 2026-02-18 ~current | Unified schema. Dropped protocol noise (initialize, tools/list, DELETE). Three event types: session, step, summary. Added double3 (nextStepNeeded). All events indexed on client. |

**Historical filtering**: For v4 queries, filter with `WHERE blob1 IN ('session','step','summary')`. Old fetch-level rows have blob1=client name (not event type) so they're naturally excluded.

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

### Daily GET attempts (not active sessions)

```sql
SELECT
  toDate(timestamp) AS day,
  SUM(_sample_interval) AS get_attempts
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

### Requests marking completion (nextStepNeeded=false)

```sql
SELECT
  index1 AS client,
  blob2 AS final_tag,
  SUM(_sample_interval) AS completion_requests
FROM lotus_wisdom_usage
WHERE blob1 = 'step'
  AND blob2 NOT IN ('begin', 'meditate')
  AND double3 = 0
GROUP BY client, final_tag
ORDER BY completion_requests DESC
```

### Average submitted step number on completion requests

```sql
SELECT
  SUM(double1 * _sample_interval) / SUM(_sample_interval) AS avg_steps,
  SUM(double2 * _sample_interval) / SUM(_sample_interval) AS avg_estimated_total
FROM lotus_wisdom_usage
WHERE blob1 = 'step'
  AND blob2 NOT IN ('begin', 'meditate')
  AND double3 = 0
  AND double1 > 0
  AND double2 > 0
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

## Service limits and retention

Use Cloudflare's [Analytics Engine limits](https://developers.cloudflare.com/analytics/analytics-engine/limits/)
and [pricing](https://developers.cloudflare.com/analytics/analytics-engine/pricing/) references for current quotas and retention.
The worker writes one index and up to four blobs and three doubles per event.

## Client Detection

Client identification uses `parseClient()` which matches against known User-Agent strings.

| UA pattern | Detected as | Source |
|------------|-------------|--------|
| `Claude-User` (case-insensitive exact match) | `claude-ai` | Claude.ai web/desktop app |
| Starts with `claude/` and contains `cfnetwork` | `claude-ios` | Claude iOS client pattern |
| `claude-ai`, `claude.ai` | `claude-ai` | Claude AI variants |
| `claude-code`, `claude code` | `claude-code` | Claude Code CLI |
| `cherrystudio` | `cherrystudio` | Cherry Studio |
| `cursor` | `cursor` | Cursor IDE (sends `Cursor/x.x.x (os arch)`) |
| `gemini` | `gemini` | Gemini CLI |
| `windsurf` | `windsurf` | Windsurf IDE |
| `cline` | `cline` | Cline VS Code extension |
| `smithery` | `smithery` | Smithery proxy |
| `mcp-remote` | `mcp-remote` | mcp-remote npm bridge |
| `openai-mcp` | `openai` | OpenAI MCP client pattern |
| `go-http-client` | `go-client` | Generic Go HTTP client |
| `undici` (exact) | `undici` | Generic Undici client |
| `node` (exact) | `node` | Generic Node client |
| _(none matched)_ | `unknown` | Generic SDK clients |

Matching is case-insensitive and ordered as in `src/shared/parse-client.ts`; labels are heuristics, not authenticated client identities. The raw UA is truncated to 200 characters in `blob4` so unknown patterns can be investigated.

To improve detection: query the "Discover unknown clients" SQL above periodically, identify new patterns, and add them to `parseClient()`.

## Gotchas

- **Local dev**: `writeDataPoint()` is NOT available in `wrangler dev`. The `track()` helper silently catches errors.
- **Best-effort telemetry**: `track()` catches errors, so a successful tool response does not confirm that analytics were recorded.
- **Sampling**: Use `SUM(_sample_interval)` instead of `COUNT()` to account for sampled data. Counts remain estimates of recorded requests.
- **Ordered arrays**: Blob/double positions are fixed. `blob1` is always the first element. Document schema changes in the Schema History table above.
- **No backfill**: Written data is append-only; consult the linked limits reference for current retention.
- **Dataset auto-created**: No dashboard setup needed. First `writeDataPoint()` call creates the dataset.
- **POST body parsing**: Tool-level tracking uses `request.clone()` + `ctx.waitUntil()` for JSON body parsing. `writeDataPoint()` itself is fire-and-forget (no await needed), but the `.json()` call preceding it needs `ctx.waitUntil()` to prevent isolate termination.
- **nextStepNeeded encoding**: `double3` stores 1 for `true` (journey continues) and 0 for explicit `false` (completion requested). Default is 1 so missing values don't look like completions.

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
  ANALYTICS: AnalyticsEngineDataset;
};
```
