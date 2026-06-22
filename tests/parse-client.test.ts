import { describe, expect, it } from "vitest";
import { parseClient } from "../src/shared/parse-client";

describe("parseClient", () => {
  it("matches exact-string clients", () => {
    expect(parseClient("claude-user")).toBe("claude-ai");
    expect(parseClient("undici")).toBe("undici");
    expect(parseClient("node")).toBe("node");
  });

  it("matches substring clients", () => {
    expect(parseClient("claude-code/1.2")).toBe("claude-code");
    expect(parseClient("Cursor/0.4")).toBe("cursor");
    expect(parseClient("node gemini-cli")).toBe("gemini");
    expect(parseClient("smithery-runner")).toBe("smithery");
    expect(parseClient("mcp-remote/0.1")).toBe("mcp-remote");
    expect(parseClient("Go-http-client/2.0")).toBe("go-client");
  });

  it("classifies the claude-ios cfnetwork User-Agent", () => {
    expect(parseClient("Claude/1.0 CFNetwork/1410 Darwin/22.6.0")).toBe(
      "claude-ios",
    );
  });

  it("returns unknown for unrecognized UA", () => {
    expect(parseClient("RandomBot/9")).toBe("unknown");
    expect(parseClient("")).toBe("unknown");
  });

  it("is case-insensitive", () => {
    expect(parseClient("CLAUDE-USER")).toBe("claude-ai");
    expect(parseClient("CURSOR")).toBe("cursor");
    expect(parseClient("GO-HTTP-CLIENT/1.1")).toBe("go-client");
    expect(parseClient("NODE")).toBe("node");
  });
});
