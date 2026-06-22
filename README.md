# 🪷 Lotus Wisdom MCP Server

<p align="center">
  <img src="assets/lotus-flower.png" alt="Lotus Flower" width="400"/>
</p>

An MCP server implementation that provides a tool for problem-solving using the Lotus Sutra's wisdom framework, combining analytical thinking with intuitive wisdom.

## Features

* Multi-faceted problem-solving approach inspired by the Lotus Sutra
* Step-by-step thought process with different thinking techniques
* Meditation pauses to allow insights to emerge naturally
* **Interactive visualization** via MCP ext-apps (Claude Desktop, Cursor, ChatGPT) — adapts to the host light/dark theme and is keyboard-accessible
* **MCP Prompts** (`contemplate`, `deep-inquiry`) for one-step guided contemplative sessions
* **Structured tool output** (`structuredContent` + `outputSchema`) alongside the text response
* Tracks both tag journey and wisdom domain movements
* Available as a local stdio package (`npx`) or a hosted remote Connector
* Final integration of insights into a clear response

## Background

This MCP server was developed from the [Lotus OS prompt](https://github.com/linxule/prompts/blob/main/cognitive-techniques/lotus_os.md), which was designed to implement a cognitive framework based on the Lotus Sutra. The MCP server format makes this framework more accessible and easier to use with Claude and other AI assistants.

Note: The original prompt framework may work less effectively with newer Claude models, but this MCP server implementation provides consistent functionality across model versions.

## Implementation Details

The server implements a structured thinking process using wisdom domains inspired by the Lotus Sutra:

### Wisdom Domains and Tags

The server organizes thoughts using wisdom domains (all valid values for the `tag` input parameter):

* **Entry** (🚪): `begin`
  - Begin your journey here - receives the full framework before contemplation starts

* **Skillful Means** (🔆): `upaya`, `expedient`, `direct`, `gradual`, `sudden`
  - Different approaches to truth - sometimes direct pointing, sometimes gradual unfolding

* **Non-Dual Recognition** (☯️): `recognize`, `transform`, `integrate`, `transcend`, `embody`
  - Aspects of awakening to what's already present - recognition IS transformation

* **Meta-Cognitive** (🧠): `examine`, `reflect`, `verify`, `refine`, `complete`
  - The mind watching its own understanding unfold

* **Process Flow** (🌊): `open`, `engage`, `express`
  - A natural arc that can contain any of the above approaches

* **Meditation** (🧘): `meditate`
  - Pausing to let insights emerge from stillness

### Thought Visualization

In clients that support MCP ext-apps, each step renders inline as an interactive "Living Trace" (see [Interactive Visualization](#interactive-visualization-ext-apps) below). For every client, each step also returns:

* Journey tracking showing both the tag path and the wisdom-domain movements
* Domain-specific labels and the current contemplation text
* Structured output (`structuredContent` + `outputSchema`) for programmatic consumers

Note: The local stdio server can emit per-step trace lines to its console (stderr) when run with `LOTUS_DEBUG=true`, helping developers follow the thinking process.

### Process Flow

1. The user submits a problem to solve
2. The model begins with `tag='begin'` to receive the full framework
3. The model continues with contemplation tags (open, examine, integrate, etc.)
4. Each thought builds on previous ones and may revise understanding
5. The tool tracks both the tag journey and wisdom domain movements
6. Meditation pauses can be included for clarity
7. When status='WISDOM_READY' is returned, the tool's work is complete
8. The model then expresses the final wisdom naturally in its own voice

## Available Tools

### lotuswisdom

A tool for problem-solving using the Lotus Sutra's wisdom framework, with various approaches to understanding.

**Begin your journey with `tag='begin'`** - this returns the full framework (philosophy, domains, guidance) to ground your contemplation. Then continue with the other tags.

**Inputs:**

* `tag` (string, required): The current processing technique (must be one of the tags listed above)
* `content` (string, required): The content of the current processing step
* `stepNumber` (integer, required): Current number in sequence
* `totalSteps` (integer, required): Estimated total steps needed
* `nextStepNeeded` (boolean, required): Whether another step is needed
* `isMeditation` (boolean, optional): Whether this step is a meditative pause
* `meditationDuration` (integer, optional): Duration for meditation in seconds (1-10)
* `previousJourney` (string, optional): The `journey` string from a previous response, e.g. `"begin → open → examine"`. Lets the AI carry journey continuity forward in stateless clients (such as the remote Worker), where the server keeps no session state.

**Returns:** both a JSON text block and matching `structuredContent` (validated against the tool's `outputSchema`):
- Processing status with current step information, wisdom domain, and journey tracking
- `FRAMEWORK_RECEIVED` status (with the full framework) on the first `begin` step
- `MEDITATION_COMPLETE` status for meditation steps
- `WISDOM_READY` status when the contemplative process is complete

The tool also declares behavioral annotations — `readOnlyHint`, `idempotentHint`, `destructiveHint: false`, `openWorldHint: false` — so hosts can treat it as a safe, side-effect-free call.

### lotuswisdom_summary

Get a summary of the current contemplative journey.

**Inputs:**

* `previousJourney` (string, optional): The `journey` string from a previous response, used to reconstruct the summary in stateless clients.

**Returns:**
- Journey length
- Domain journey showing movement between wisdom domains
- Summary of all steps with their tags, domains, and brief content

## MCP Prompts

The server registers two prompts that scaffold a guided contemplative session (surfaced as slash commands or prompt pickers in clients that support MCP Prompts):

* **`contemplate`** — argument `question`: opens a single-question contemplation, instructing the model to start with `tag='begin'`, iterate, and speak the wisdom only once `status='WISDOM_READY'`.
* **`deep-inquiry`** — argument `topic`: begins a longer inquiry that moves deliberately across the wisdom domains (process → meta-cognitive → non-dual → meditation).

## Usage

The Lotus Wisdom tool is designed for:

* Breaking down complex problems requiring multi-faceted understanding
* Questions that benefit from both direct and gradual approaches
* Problems where apparent contradictions need integration
* Situations requiring both analytical and intuitive understanding
* Tasks that benefit from meditative pauses to allow insight
* Questions containing their own inherent wisdom

## Example Usage

Here's how a conversation with Claude might flow when using the Lotus Wisdom MCP server:

**User**: "Help me understand the relationship between freedom and responsibility."

**Claude** would begin the journey with `tag='begin'` to receive the framework, then continue:

1. First, enter the contemplative space:
```json
{
  "tag": "begin",
  "content": "Entering contemplation on freedom and responsibility.",
  "stepNumber": 1,
  "totalSteps": 6,
  "nextStepNeeded": true
}
```
→ Returns `FRAMEWORK_RECEIVED` with full framework

2. Then, establish an opening thought:
```json
{
  "tag": "open",
  "content": "The question explores the relationship between freedom and responsibility, which contain an apparent tension but also deep connection.",
  "stepNumber": 2,
  "totalSteps": 6,
  "nextStepNeeded": true
}
```

3. Engage with different perspectives:
```json
{
  "tag": "direct",
  "content": "Freedom and responsibility are two sides of the same coin. True freedom isn't absence of constraints but the capacity to choose our response within constraints.",
  "stepNumber": 3,
  "totalSteps": 6,
  "nextStepNeeded": true
}
```

4. Perhaps take a meditation pause:
```json
{
  "tag": "meditate",
  "content": "Contemplating how freedom without responsibility becomes chaos, and responsibility without freedom becomes oppression.",
  "stepNumber": 4,
  "totalSteps": 6,
  "nextStepNeeded": true,
  "isMeditation": true
}
```

5. Integrate the understanding:
```json
{
  "tag": "integrate",
  "content": "Freedom and responsibility mutually enable each other. Our freedom to choose gives rise to our responsibility for what we choose, and our willingness to take responsibility expands our freedom.",
  "stepNumber": 5,
  "totalSteps": 6,
  "nextStepNeeded": true
}
```

6. Express the final understanding:
```json
{
  "tag": "express",
  "content": "The paradox resolves when we see that authentic freedom includes responsibility as its natural expression.",
  "stepNumber": 6,
  "totalSteps": 6,
  "nextStepNeeded": false
}
```

When the tool returns `status: 'WISDOM_READY'`, Claude then speaks the final wisdom naturally, integrating all the insights from the contemplative journey.

## Installation

[![Smithery Badge](https://smithery.ai/badge/lotus-wisdom-mcp)](https://smithery.ai/server/lotus-wisdom-mcp)

Install via [Smithery](https://smithery.ai/server/lotus-wisdom-mcp) for one-click setup, or follow the manual instructions below.

Requires [Node.js](https://nodejs.org/) 18+. The server runs locally via `npx`.

### CLI Install (one-liner)

```bash
# Claude Code
claude mcp add lotus-wisdom -- npx -y lotus-wisdom-mcp

# Codex CLI (OpenAI)
codex mcp add lotus-wisdom -- npx -y lotus-wisdom-mcp

# Gemini CLI (Google)
gemini mcp add lotus-wisdom npx -y lotus-wisdom-mcp
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

| OS | Config path |
|----|-------------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

```json
{
  "mcpServers": {
    "lotus-wisdom": {
      "command": "npx",
      "args": ["-y", "lotus-wisdom-mcp"]
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json` (workspace) or open Command Palette > `MCP: Open User Configuration` (global):

```json
{
  "servers": {
    "lotus-wisdom": {
      "command": "npx",
      "args": ["-y", "lotus-wisdom-mcp"]
    }
  }
}
```

> **Note**: VS Code uses `"servers"` as the top-level key, not `"mcpServers"`. Other VS Code forks (Trae, Void, PearAI, etc.) typically use this same format.

### Cursor

Add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project):

```json
{
  "mcpServers": {
    "lotus-wisdom": {
      "command": "npx",
      "args": ["-y", "lotus-wisdom-mcp"]
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json` (Windows: `%USERPROFILE%\.codeium\windsurf\mcp_config.json`):

```json
{
  "mcpServers": {
    "lotus-wisdom": {
      "command": "npx",
      "args": ["-y", "lotus-wisdom-mcp"]
    }
  }
}
```

### Cline

Open MCP Servers icon in Cline panel > Configure > Advanced MCP Settings, then add:

```json
{
  "mcpServers": {
    "lotus-wisdom": {
      "command": "npx",
      "args": ["-y", "lotus-wisdom-mcp"]
    }
  }
}
```

### Cherry Studio

In Settings > MCP Servers > Add Server, set Type to `STDIO`, Command to `npx`, Args to `-y lotus-wisdom-mcp`. Or paste in JSON/Code mode:

```json
{
  "lotus-wisdom": {
    "name": "Lotus Wisdom",
    "command": "npx",
    "args": ["-y", "lotus-wisdom-mcp"],
    "isActive": true
  }
}
```

### Witsy

In Settings > MCP Servers, add a new server with Type: `stdio`, Command: `npx`, Args: `-y lotus-wisdom-mcp`.

### Codex CLI (TOML config)

Alternatively, edit `~/.codex/config.toml` directly:

```toml
[mcp_servers.lotus-wisdom]
command = "npx"
args = ["-y", "lotus-wisdom-mcp"]
```

### Gemini CLI (JSON config)

Alternatively, edit `~/.gemini/settings.json` directly:

```json
{
  "mcpServers": {
    "lotus-wisdom": {
      "command": "npx",
      "args": ["-y", "lotus-wisdom-mcp"]
    }
  }
}
```

### Windows

On Windows, `npx` requires a shell wrapper. Replace `"command": "npx"` with:

```json
{
  "command": "cmd",
  "args": ["/c", "npx", "-y", "lotus-wisdom-mcp"]
}
```

For CLI tools on Windows:

```bash
claude mcp add lotus-wisdom -- cmd /c npx -y lotus-wisdom-mcp
codex mcp add lotus-wisdom -- cmd /c npx -y lotus-wisdom-mcp
```

### ChatGPT

ChatGPT only supports remote MCP servers over HTTPS. Use [Smithery](https://smithery.ai/server/lotus-wisdom-mcp) or connect directly to the hosted instance below via ChatGPT Settings > Connectors.

### Remote (hosted)

A public instance is available at `https://lotus-wisdom-mcp.linxule.workers.dev/mcp`. No API key needed.

For clients supporting Streamable HTTP, connect directly to the URL. For stdio-only clients, use `mcp-remote`:

```json
{
  "mcpServers": {
    "lotus-wisdom": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://lotus-wisdom-mcp.linxule.workers.dev/mcp"]
    }
  }
}
```

To self-host your own instance, see [`worker/README.md`](worker/README.md).

### Building from source

```bash
bun install
bun run build
bun run start
```

Enable debug mode:

```bash
LOTUS_DEBUG=true bun run start
```

## Interactive Visualization (ext-apps)

In MCP clients that support ext-apps (Claude Desktop, Cursor, ChatGPT), the tool renders an interactive "Living Trace" visualization inline in the chat:

* **Journey trace**: SVG circles colored by wisdom domain appear as steps arrive
* **Domain colors**: Process (gold), Skillful Means (amber), Non-Dual (green), Meta-Cognitive (blue), Meditation (teal)
* **Meditation breathing**: Hollow circles with gentle inhale/exhale animation
* **Completion**: Journey resolves into a gradient path showing the full domain arc
* **Click to explore**: Pin any step to read its contemplation text
* **Collapse for long journeys**: Shows last 8 steps with a "+N" cluster for earlier ones

Clients without ext-apps support are unaffected — they receive the same JSON tool responses as before.

## How It Works

The Lotus Wisdom framework recognizes that wisdom often emerges not through linear thinking but through a dance between different modes of understanding. The tool facilitates this by:

1. **Tracking Wisdom Domains**: As you move through different tags, the tool tracks which wisdom domains you're engaging, helping you see the shape of your inquiry.

2. **Journey Consciousness**: The tool maintains awareness of your complete journey, showing both the sequence of tags used and the movement between wisdom domains.

3. **Non-Linear Progress**: While steps are numbered, the process isn't strictly linear. You can revisit, revise, and branch as understanding deepens.

4. **Integration Points**: Tags like `integrate`, `transcend`, and `embody` help weave insights together rather than keeping them separate.

5. **Natural Expression**: The tool handles the contemplative process, but the final wisdom is always expressed naturally by the AI, not as formatted output.

### Token Optimization Design

MCP tool descriptions stay in the AI's context window constantly when the server is connected. To minimize this overhead while preserving the full teaching content:

- **Constant context (~150 tokens)**: The `lotuswisdom` tool description is kept minimal—just enough for the AI to know when and how to use it
- **On-demand learning (~1,200 tokens)**: The complete framework is delivered when calling with `tag='begin'`, including:
  - Philosophy and domain spirits
  - Parameter explanations (tag, content, stepNumber, etc.)
  - Response format details (wisdomDomain, journey, domainJourney)
  - Meditation handling (MEDITATION_COMPLETE status)
  - When to use guidance
- **Learn first, practice second**: The `begin` tag ensures models receive complete understanding before contemplating

This approach reduces constant context overhead by ~85% when the tool is idle. When actually used, the full framework is delivered on first step—nothing is lost.

## License

This MCP server is licensed under the MIT License. For more details, please see the LICENSE file in the project repository.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests on the [GitHub repository](https://github.com/linxule/lotus-wisdom-mcp).

## Version

Current version: 0.8.0

### What's New in 0.8.0

- **Single source of truth**: domain logic, tool/server metadata, prompts, and the client parser now live in `src/shared/` and are imported by both the stdio entry (`index.ts`) and the Cloudflare Worker — no more local-vs-remote drift
- **High-level `McpServer` everywhere**: the local stdio server was migrated from the low-level `Server` API to `McpServer`, matching the Worker
- **MCP Prompts**: `contemplate` and `deep-inquiry` for guided contemplative sessions
- **Structured tool output**: tools now return `structuredContent` validated against an `outputSchema`, plus behavioral annotations (`readOnlyHint`, `idempotentHint`, `destructiveHint: false`, `openWorldHint: false`) and a server `instructions` field
- **Theme-aware, accessible UI**: the ext-apps journey visualization adapts to the host light/dark theme and is keyboard-accessible
- **Security & cleanup**: `@modelcontextprotocol/sdk` bumped to `^1.27.1`, `zod` added, `chalk` removed; the legacy Express SSE server (`server.ts`), the `express` deps, and the `Dockerfile` were removed; the repo moved to bun lockfiles. Added a vitest test suite (`tests/`) and a single-source version workflow (`src/shared/version.ts` + `bun run sync-version`)
- **Server icon & website**: `server.json` advertises the remote Worker (`remotes[]`), a `websiteUrl`, and icon `sizes`; the Worker advertises icons/website in the initialize handshake and serves the icon as same-origin bytes at `/icon.png`

### What's New in 0.7.0

- **Fully stateless Worker**: removed the Durable Object — the remote Worker now creates a fresh server per request and relies on the client-driven `previousJourney` parameter for journey continuity (eliminating accumulated SSE wall time)

### What's New in 0.6.0

- **Server icon**: added an icon to `server.json` and the Worker so MCP Registry and claude.ai Connectors display the lotus logo
- **Warmer UI** and (since reverted) experimental Durable Object session state

### What's New in 0.5.0

- **npm + MCP Registry publish**: hardened packaging and published to npm and the official MCP Registry

### What's New in 0.4.0

- **Interactive Visualization**: MCP ext-apps UI renders a "Living Trace" journey inline in supporting clients (Claude Desktop, Cursor, ChatGPT)
- **Completion Fix**: Any tag with `nextStepNeeded=false` now correctly returns `WISDOM_READY` (previously only `express` and `complete` could complete)
- **Cloudflare Worker**: Worker deployment updated with ext-apps resource serving

### What's New in 0.3.2

- 🚪 **Simplified Begin**: `tag='begin'` can now be called with just `{"tag":"begin"}` - all other params auto-filled
- 🤖 **Better Haiku/Small Model Support**: Removes friction for models that don't infer all required params

### What's New in 0.3.1

- 📚 **Complete Framework Learning**: `begin` tag now returns full parameter explanations, response format details, and meditation handling
- 🔢 **Accurate Token Counts**: Updated documentation with actual token measurements (~150 constant, ~1,200 on-demand)

### What's New in 0.3.0

- 🚪 **Begin Tag**: New `tag='begin'` opens the journey—returns full framework before contemplation starts
- ⚡ **Optimized Token Footprint**: Reduced constant context overhead from ~1400 to ~200 tokens while preserving full teaching content
- 🧘 **Learn First, Practice Second**: The `begin` tag ensures models receive complete understanding before contemplating
- 📦 **Updated SDK**: Upgraded to @modelcontextprotocol/sdk 1.23.0

### What's New in 0.2.1

- 📋 **MCP Registry Enhancement**: Added `title` field for better discoverability
- 🎯 **Full Compliance**: Now fully compliant with official MCP publishing guide
- 🔗 **Registry Links**: Available on [Official MCP Registry](https://registry.mcpservers.org/)

### What's New in 0.2.0

- 🌐 **HTTP Transport Support**: Now deployable on smithery.ai and other HTTP-based platforms
- 🔄 **Dual Transport**: Maintains stdio support for npm/CLI users while adding HTTP for remote deployment
- 📦 **Updated SDK**: Upgraded to @modelcontextprotocol/sdk 1.20.1 with Streamable HTTP support
- 🪷 **New Logo**: Terminal-aesthetic lotus logo perfect for developer tools
- ⚡ **Session Management**: HTTP version includes full session management for stateful wisdom journeys