[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/linxule-lotus-wisdom-mcp-badge.png)](https://mseep.ai/app/linxule-lotus-wisdom-mcp)

# 🪷 Lotus Wisdom MCP Server

<p align="center">
  <img src="assets/lotus-flower.png" alt="Lotus Flower" width="400"/>
</p>

An MCP server implementation that provides a tool for problem-solving using the Lotus Sutra's wisdom framework, combining analytical thinking with intuitive wisdom.
## Features

* Multi-faceted problem-solving approach inspired by the Lotus Sutra
* Step-by-step thought process with different thinking techniques
* Meditation pauses to allow insights to emerge naturally
* Beautifully formatted thought process visualization with colors and symbols
* Final integration of insights into a clear response

## Background

This MCP server was developed from the [Lotus OS prompt](https://github.com/linxule/prompts/blob/main/cognitive-techniques/lotus_os.md), which was designed to implement a cognitive framework based on the Lotus Sutra. The MCP server format makes this framework more accessible and easier to use with Claude and other AI assistants.

Note: The original prompt framework may work less effectively with newer Claude models, but this MCP server implementation provides consistent functionality across model versions.

## Implementation Details

The server implements a structured thinking process using the following components:

### Tag Types

The server organizes thoughts using various tag categories (all valid values for the `tag` input parameter):

* **Skillful Means**: upaya, expedient, direct, gradual, sudden
* **Non-Dual Recognition**: recognize, transform, integrate, transcend, embody
* **Meta-Cognitive Awareness**: examine, reflect, verify, refine, complete
* **Process Steps**: open, engage, transform, express, meditate
* **Final Output**: OUTPUT

### Thought Visualization

Each thought is beautifully formatted with:

* Colorful output using the chalk library
* Tag-specific symbols (e.g., 🔆 for skillful means, ☯️ for non-dual recognition)
* Box-drawing characters to create clear thought boundaries
* Special meditation formatting with pause indicators
* Final output with double-line borders for emphasis

Note: The visualization appears in the server console output, helping developers track the thinking process.

### Process Flow

1. The user submits a problem to solve
2. The model works through a sequence of thoughts using different tags
3. Each thought builds on previous ones and may revise understanding
4. Meditation pauses can be included for clarity
5. The process concludes with a final OUTPUT thought

## Tool

### lotuswisdom

A tool for problem-solving using the Lotus Sutra's wisdom framework, with various approaches to understanding.

**Inputs:**

* `tag` (string): The current processing technique (must be one of the core tags listed above)
* `content` (string): The content of the current processing step
* `stepNumber` (integer): Current number in sequence
* `totalSteps` (integer): Estimated total steps needed
* `nextStepNeeded` (boolean): Whether another step is needed
* `isMeditation` (boolean, optional): Whether this step is a meditative pause
* `meditationDuration` (integer, optional): Duration for meditation in seconds

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

**Claude** would then use the lotuswisdom tool through multiple steps:

1. First, establish an opening thought:
```json
{
  "tag": "open",
  "content": "The question explores the relationship between freedom and responsibility, which contain an apparent tension but also deep connection.",
  "stepNumber": 1,
  "totalSteps": 5,
  "nextStepNeeded": true
}
```

2. Then engage with different perspectives:
```json
{
  "tag": "direct",
  "content": "Freedom and responsibility are two sides of the same coin. True freedom isn't absence of constraints but the capacity to choose our response within constraints.",
  "stepNumber": 2,
  "totalSteps": 5,
  "nextStepNeeded": true
}
```

3. Perhaps take a meditation pause:
```json
{
  "tag": "meditate",
  "content": "Contemplating how freedom without responsibility becomes chaos, and responsibility without freedom becomes oppression.",
  "stepNumber": 3,
  "totalSteps": 5,
  "nextStepNeeded": true,
  "isMeditation": true
}
```

4. Integrate the understanding:
```json
{
  "tag": "integrate",
  "content": "Freedom and responsibility mutually enable each other. Our freedom to choose gives rise to our responsibility for what we choose, and our willingness to take responsibility expands our freedom.",
  "stepNumber": 4,
  "totalSteps": 5,
  "nextStepNeeded": true
}
```

5. Provide a final output:
```json
{
  "tag": "OUTPUT",
  "content": "Freedom and responsibility exist in dynamic balance. Freedom is the power to choose, while responsibility is accountability for those choices. They're not opposing forces but complementary aspects of human agency. Without freedom, responsibility would be mere obligation. Without responsibility, freedom would degrade into impulsivity. The most fulfilled lives embrace both: using freedom to make meaningful choices while taking responsibility for their consequences.",
  "stepNumber": 5,
  "totalSteps": 5,
  "nextStepNeeded": false
}
```

The result would be a thoughtful, multi-perspective response to the question that shows the process of arriving at wisdom rather than just stating conclusions.

## Configuration

### Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

#### From npm (recommended)

```json
{
  "mcpServers": {
    "lotus-wisdom": {
      "command": "npx",
      "args": [
        "-y", 
        "lotus-wisdom-mcp"
      ]
    }
  }
}
```

#### From GitHub

```json
{
  "mcpServers": {
    "lotus-wisdom": {
      "command": "npx",
      "args": [
        "-y", 
        "git+https://github.com/linxule/lotus-wisdom-mcp.git"
      ]
    }
  }
}
```

#### docker

```json
{
  "mcpServers": {
    "lotus-wisdom": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "lotus-wisdom-mcp"
      ]
    }
  }
}
```

## Building

Docker:

```
docker build -t lotus-wisdom-mcp -f Dockerfile .
```

## License

This MCP server is licensed under the MIT License. For more details, please see the LICENSE file in the project repository.

## Connect from Claude Desktop

Since Claude Desktop doesn't yet have native support for remote MCP servers with authentication, you'll need to use the `mcp-remote` proxy:

1. Update your Claude Desktop configuration file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the following configuration:

```json
{
  "mcpServers": {
    "lotus-wisdom": {
      "command": "npx",
      "args": ["mcp-remote", "https://lotus-wisdom-mcp.linxule.workers.dev/sse"]
    }
  }
}
```

3. Restart Claude Desktop (Cmd/Ctrl + R)

4. When Claude restarts, a browser window will open for OAuth authentication. Complete the authorization flow to grant Claude access to the MCP server.

5. Once authenticated, you'll see the Lotus Wisdom tools available in Claude's tool menu (bottom right corner).

## Available Tools

// ... existing code ... 