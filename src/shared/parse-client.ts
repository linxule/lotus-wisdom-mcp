// Maps a raw User-Agent string to a stable client label for analytics.
// Lives in the shared module so it is unit-testable independent of the Worker
// runtime. Add new clients here; see worker/ANALYTICS.md for the query to find
// unrecognized UAs.
export function parseClient(ua: string): string {
  const lower = ua.toLowerCase();
  if (lower === "claude-user") return "claude-ai";
  if (lower.startsWith("claude/") && lower.includes("cfnetwork"))
    return "claude-ios";
  if (lower.includes("claude-ai") || lower.includes("claude.ai"))
    return "claude-ai";
  if (lower.includes("claude-code") || lower.includes("claude code"))
    return "claude-code";
  if (lower.includes("cherrystudio")) return "cherrystudio";
  if (lower.includes("cursor")) return "cursor";
  if (lower.includes("gemini")) return "gemini";
  if (lower.includes("windsurf")) return "windsurf";
  if (lower.includes("cline")) return "cline";
  if (lower.includes("smithery")) return "smithery";
  if (lower.includes("mcp-remote")) return "mcp-remote";
  if (lower.includes("openai-mcp")) return "openai";
  if (lower.includes("go-http-client")) return "go-client";
  if (lower === "undici") return "undici";
  if (lower === "node") return "node";
  return "unknown";
}
