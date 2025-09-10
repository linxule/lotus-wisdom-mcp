# 🪷 Lotus Wisdom MCP Server

<p align="center">
  <img src="assets/lotus-flower.png" alt="Lotus Flower" width="400"/>
</p>

[![smithery badge](https://smithery.ai/badge/@linxule/lotus-wisdom-mcp)](https://smithery.ai/server/@linxule/lotus-wisdom-mcp)

An MCP server implementation that provides a tool for problem-solving using the Lotus Sutra's wisdom framework, combining analytical thinking with intuitive wisdom.

## Features

* Multi-faceted problem-solving approach inspired by the Lotus Sutra
* Step-by-step thought process with different thinking techniques
* Meditation pauses to allow insights to emerge naturally
* Beautifully formatted thought process visualization with colors and symbols
* Tracks both tag journey and wisdom domain movements
* Final integration of insights into a clear response

## Background

This MCP server was developed from the [Lotus OS prompt](https://github.com/linxule/prompts/blob/main/cognitive-techniques/lotus_os.md), which was designed to implement a cognitive framework based on the Lotus Sutra. The MCP server format makes this framework more accessible and easier to use with Claude and other AI assistants.

Note: The original prompt framework may work less effectively with newer Claude models, but this MCP server implementation provides consistent functionality across model versions.

## Implementation Details

The server implements a structured thinking process using wisdom domains inspired by the Lotus Sutra:

### Wisdom Domains and Tags

The server organizes thoughts using five wisdom domains (all valid values for the `tag` input parameter):

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

Each thought is beautifully formatted with:

* Colorful output using the chalk library
* Domain-specific symbols and colors
* Box-drawing characters to create clear thought boundaries
* Special meditation formatting with pause indicators
* Journey tracking showing both tag path and domain movements

Note: The visualization appears in the server console output, helping developers track the thinking process.

### Process Flow

1. The user submits a problem to solve
2. The model works through a sequence of thoughts using different tags
3. Each thought builds on previous ones and may revise understanding
4. The tool tracks both the tag journey and wisdom domain movements
5. Meditation pauses can be included for clarity
6. When status='WISDOM_READY' is returned, the tool's work is complete
7. The model then expresses the final wisdom naturally in its own voice

## Available Tools

### lotuswisdom

A tool for problem-solving using the Lotus Sutra's wisdom framework, with various approaches to understanding.

**Inputs:**

* `tag` (string, required): The current processing technique (must be one of the tags listed above)
* `content` (string, required): The content of the current processing step
* `stepNumber` (integer, required): Current number in sequence
* `totalSteps` (integer, required): Estimated total steps needed
* `nextStepNeeded` (boolean, required): Whether another step is needed
* `isMeditation` (boolean, optional): Whether this step is a meditative pause
* `meditationDuration` (integer, optional): Duration for meditation in seconds (1-10)

**Returns:**
- Processing status with current step information, wisdom domain, and journey tracking
- `MEDITATION_COMPLETE` status for meditation steps
- `WISDOM_READY` status when the contemplative process is complete

### lotuswisdom_summary

Get a summary of the current contemplative journey.

**Inputs:** None

**Returns:**
- Journey length
- Domain journey showing movement between wisdom domains
- Summary of all steps with their tags, domains, and brief content

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

5. Express the final understanding:
```json
{
  "tag": "express",
  "content": "The paradox resolves when we see that authentic freedom includes responsibility as its natural expression.",
  "stepNumber": 5,
  "totalSteps": 5,
  "nextStepNeeded": false
}
```

When the tool returns `status: 'WISDOM_READY'`, Claude then speaks the final wisdom naturally, integrating all the insights from the contemplative journey.

## Configuration

### Installing via Smithery

To install lotus-wisdom-mcp for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@linxule/lotus-wisdom-mcp):

```bash
npx -y @smithery/cli install @linxule/lotus-wisdom-mcp --client claude
```

### Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

#### From Smithery (recommended for easy installation)

```json
{
  "mcpServers": {
    "lotus-wisdom": {
      "command": "npx",
      "args": [
        "-y",
        "@smithery/server-linxule-lotus-wisdom-mcp"
      ]
    }
  }
}
```

Or install directly via [Smithery.ai](https://smithery.ai/server/@linxule/lotus-wisdom-mcp)

#### From npm

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

#### Docker

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

### Building

To build the project locally:

```bash
npm install
npm run build
```

To build the Docker image:

```bash
docker build -t lotus-wisdom-mcp -f Dockerfile .
```

### Development

For local development:

```bash
npm install
npm run dev
```

Enable debug mode by setting the environment variable:

```bash
LOTUS_DEBUG=true npm start
```

## How It Works

The Lotus Wisdom framework recognizes that wisdom often emerges not through linear thinking but through a dance between different modes of understanding. The tool facilitates this by:

1. **Tracking Wisdom Domains**: As you move through different tags, the tool tracks which wisdom domains you're engaging, helping you see the shape of your inquiry.

2. **Journey Consciousness**: The tool maintains awareness of your complete journey, showing both the sequence of tags used and the movement between wisdom domains.

3. **Non-Linear Progress**: While steps are numbered, the process isn't strictly linear. You can revisit, revise, and branch as understanding deepens.

4. **Integration Points**: Tags like `integrate`, `transcend`, and `embody` help weave insights together rather than keeping them separate.

5. **Natural Expression**: The tool handles the contemplative process, but the final wisdom is always expressed naturally by the AI, not as formatted output.

## License

This MCP server is licensed under the MIT License. For more details, please see the LICENSE file in the project repository.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests on the [GitHub repository](https://github.com/linxule/lotus-wisdom-mcp).

## Version

Current version: 0.1.2