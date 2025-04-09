# Lotus Wisdom MCP Server

A Model Context Protocol (MCP) server that implements the Lotus Wisdom framework based on concepts from the Lotus Sutra. This server provides a tool for AI models to use a structured thought process that combines analytical thinking with intuitive wisdom.

## Features

- Multi-faceted problem-solving approach inspired by the Lotus Sutra
- Step-by-step thought process with different techniques:
  - Skillful Means: upaya, expedient, direct, gradual, sudden
  - Non-Dual Recognition: recognize, transform, integrate, transcend, embody
  - Meta-Cognitive Awareness: examine, reflect, verify, refine, complete
  - Process Steps: open, engage, transform, express
  - Meditative Space: meditate
- Beautifully formatted thought process visualization with colors and symbols
- Final integration of insights into a clear response

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/xule-lin/lotus-wisdom-mcp.git
cd lotus-wisdom-mcp

# Install dependencies
npm install

# Build the server
npm run build
```

### Using npm (after published)

```bash
# Global installation
npm install -g lotus-wisdom-mcp

# Or using npx to run without installing
npx -y lotus-wisdom-mcp
```

### Using Docker

```bash
# Pull the image
docker pull xulelin/lotus-wisdom-mcp

# Run the container
docker run -i --rm xulelin/lotus-wisdom-mcp
```

## Usage

### Running Locally

```bash
npm start
```

The server uses stdio for communication, making it compatible with MCP clients that support this transport method.

### Integration with Claude Desktop

To use this server with Claude Desktop:

1. Edit your Claude Desktop configuration file:
   - Windows: `%APPDATA%\Claude Desktop\config.json`
   - macOS: `~/Library/Application Support/Claude Desktop/config.json`
   - Linux: `~/.config/Claude Desktop/config.json`

2. Add the following configuration:

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

Or if running from source:

```json
{
  "mcpServers": {
    "lotus-wisdom": {
      "command": "/path/to/lotus-wisdom-mcp/dist/bundle.js"
    }
  }
}
```

Using Docker:

```json
{
  "mcpServers": {
    "lotus-wisdom": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "xulelin/lotus-wisdom-mcp"]
    }
  }
}
```

### Integration with Other MCP Clients

This server is compatible with any MCP client that supports the stdio transport method, including:

- VS Code with Copilot Chat
- Cursor
- Custom MCP-compatible applications

## API

The server provides a single tool named `lotuswisdom` with the following parameters:

- `tag`: The current processing technique (must be one of the core tags)
- `content`: The content of the current processing step
- `stepNumber`: Current number in sequence
- `totalSteps`: Current estimate of steps needed
- `nextStepNeeded`: Whether another step is needed
- `isMeditation`: Whether this step is a meditative pause
- `meditationDuration`: Optional duration for meditation in seconds

## Examples

### Basic Usage

```json
{
  "tag": "open",
  "content": "The question is about finding balance between opposing viewpoints.",
  "stepNumber": 1,
  "totalSteps": 5,
  "nextStepNeeded": true
}
```

### Meditative Pause

```json
{
  "tag": "meditate",
  "content": "Allowing insights to emerge naturally without forcing conclusions.",
  "stepNumber": 3,
  "totalSteps": 5,
  "nextStepNeeded": true,
  "isMeditation": true,
  "meditationDuration": 5
}
```

### Final Output

```json
{
  "tag": "OUTPUT",
  "content": "The balanced approach recognizes that both perspectives contain partial truth...",
  "stepNumber": 5,
  "totalSteps": 5,
  "nextStepNeeded": false
}
```

## Development

To contribute to this project:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by concepts from the Lotus Sutra and Buddhist philosophy
- Built using the Model Context Protocol developed by Anthropic 