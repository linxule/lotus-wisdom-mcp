# Lotus Wisdom MCP Server

An MCP server implementation that provides a tool for problem-solving using the Lotus Sutra's wisdom framework, combining analytical thinking with intuitive wisdom.

## Features

* Multi-faceted problem-solving approach inspired by the Lotus Sutra
* Step-by-step thought process with different thinking techniques
* Meditation pauses to allow insights to emerge naturally
* Beautifully formatted thought process visualization with colors and symbols
* Final integration of insights into a clear response

## Tool

### lotuswisdom

A tool for problem-solving using the Lotus Sutra's wisdom framework, with various approaches to understanding.

**Inputs:**

* `tag` (string): The current processing technique (must be one of the core tags)
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