#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
// Fixed chalk import for ESM
import chalk from 'chalk';

// Lotus Sutra framework tags
const CORE_TAGS = [
  // Skillful Means
  'upaya', 'expedient', 'direct', 'gradual', 'sudden',
  // Non-Dual Recognition
  'recognize', 'transform', 'integrate', 'transcend', 'embody',
  // Meta-Cognitive
  'examine', 'reflect', 'verify', 'refine', 'complete',
  // Process Steps
  'open', 'engage', 'transform', 'express', 'meditate',
  // Output
  'OUTPUT'
];

interface LotusThoughtData {
  tag: string;
  content: string;
  stepNumber: number;
  totalSteps: number;
  nextStepNeeded: boolean;
  isMeditation?: boolean;
  meditationDuration?: number;
}

class LotusWisdomServer {
  private thoughtProcess: LotusThoughtData[] = [];
  private finalOutput: string = '';

  private validateThoughtData(input: unknown): LotusThoughtData {
    const data = input as Record<string, unknown>;

    if (!data.tag || typeof data.tag !== 'string') {
      throw new Error('Invalid tag: must be a string');
    }
    
    if (!CORE_TAGS.includes(data.tag)) {
      throw new Error(`Invalid tag: ${data.tag}. Must be one of: ${CORE_TAGS.join(', ')}`);
    }
    
    if (!data.content || typeof data.content !== 'string') {
      throw new Error('Invalid content: must be a string');
    }
    
    if (!data.stepNumber || typeof data.stepNumber !== 'number') {
      throw new Error('Invalid stepNumber: must be a number');
    }
    
    if (!data.totalSteps || typeof data.totalSteps !== 'number') {
      throw new Error('Invalid totalSteps: must be a number');
    }
    
    if (typeof data.nextStepNeeded !== 'boolean') {
      throw new Error('Invalid nextStepNeeded: must be a boolean');
    }

    // If this is a final output, store it
    if (data.tag === 'OUTPUT') {
      this.finalOutput = data.content;
    }

    return {
      tag: data.tag,
      content: data.content,
      stepNumber: data.stepNumber,
      totalSteps: data.totalSteps,
      nextStepNeeded: data.nextStepNeeded,
      isMeditation: data.isMeditation as boolean | undefined,
      meditationDuration: data.meditationDuration as number | undefined,
    };
  }

  private formatThought(thoughtData: LotusThoughtData): string {
    const { tag, stepNumber, totalSteps, content, isMeditation } = thoughtData;

    // Color coding for different tag types
    let tagColor;
    let tagSymbol;
    
    // Skillful Means
    if (['upaya', 'expedient', 'direct', 'gradual', 'sudden'].includes(tag)) {
      tagColor = chalk.yellow;
      tagSymbol = '🔆';
    } 
    // Non-Dual Recognition
    else if (['recognize', 'transform', 'integrate', 'transcend', 'embody'].includes(tag)) {
      tagColor = chalk.green;
      tagSymbol = '☯️';
    } 
    // Meta-Cognitive
    else if (['examine', 'reflect', 'verify', 'refine', 'complete'].includes(tag)) {
      tagColor = chalk.blue;
      tagSymbol = '🧠';
    }
    // Process Steps
    else if (['open', 'engage', 'express'].includes(tag)) {
      tagColor = chalk.magenta;
      tagSymbol = '🌊';
    }
    // Meditation
    else if (tag === 'meditate') {
      tagColor = chalk.cyan;
      tagSymbol = '🧘';
    }
    // Output
    else if (tag === 'OUTPUT') {
      tagColor = chalk.white.bold;
      tagSymbol = '🌸';
    }
    // Transform (special case since it appears in multiple categories)
    else if (tag === 'transform') {
      tagColor = chalk.green;
      tagSymbol = '🔄';
    }
    else {
      tagColor = chalk.white;
      tagSymbol = '💭';
    }

    const header = `${tagSymbol} <${tag}> Step ${stepNumber}/${totalSteps}`;
    const formattedHeader = tagColor(header);
    
    let formattedContent;
    
    // Special formatting for meditation
    if (isMeditation) {
      formattedContent = chalk.cyan(`..........................
[letting thoughts settle into clarity]
..........................
[wisdom naturally emerging]
..........................`);
    } else {
      formattedContent = content;
    }
    
    // Special formatting for output
    if (tag === 'OUTPUT') {
      const border = '═'.repeat(Math.max(header.length, content.length) + 4);
      return `
╔${border}╗
║ ${formattedHeader} ║
╠${border}╣
║ ${content.padEnd(border.length - 2)} ║
╚${border}╝
<<<END>>>`;
    }
    
    const border = '─'.repeat(Math.max(header.length, content.length) + 4);
    return `
┌${border}┐
│ ${formattedHeader} │
├${border}┤
│ ${formattedContent.padEnd(border.length - 2)} │
└${border}┘`;
  }

  public processThought(input: unknown): { content: Array<{ type: string; text: string }>; isError?: boolean } {
    try {
      const validatedInput = this.validateThoughtData(input);

      if (validatedInput.stepNumber > validatedInput.totalSteps) {
        validatedInput.totalSteps = validatedInput.stepNumber;
      }

      this.thoughtProcess.push(validatedInput);
      const formattedThought = this.formatThought(validatedInput);
      console.error(formattedThought);

      // Include final output in the response if we're at the end
      const includeOutput = !validatedInput.nextStepNeeded && validatedInput.tag === 'OUTPUT';

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            stepNumber: validatedInput.stepNumber,
            totalSteps: validatedInput.totalSteps,
            nextStepNeeded: validatedInput.nextStepNeeded,
            tag: validatedInput.tag,
            processLength: this.thoughtProcess.length,
            finalOutput: includeOutput ? this.finalOutput : undefined
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            status: 'failed'
          }, null, 2)
        }],
        isError: true
      };
    }
  }
}

const LOTUS_WISDOM_TOOL: Tool = {
  name: "lotuswisdom",
  description: `A tool for problem-solving using the Lotus Sutra's wisdom framework.
This tool helps analyze problems through multiple approaches while recognizing inherent wisdom.
Each step can utilize different techniques for understanding and expression.

When to use this tool:
- Breaking down complex problems requiring multi-faceted understanding
- Questions that benefit from both direct and gradual approaches
- Problems where apparent contradictions need integration
- Situations requiring both analytical and intuitive understanding
- Tasks that benefit from meditative pauses to allow insight
- Questions containing their own inherent wisdom

Key features:
- Multiple approaches through Skillful Means (upaya, expedient, direct, gradual, sudden)
- Non-Dual Recognition (recognize, transform, integrate, transcend, embody)
- Meta-Cognitive Awareness (examine, reflect, verify, refine, complete)
- Process Steps (open, engage, transform, express)
- Meditative Space (meditate)
- Final Output (OUTPUT)

Process methodology:
1. Initial Opening <open> - Recognize the question's nature
2. Skillful Engagement <engage> - Choose appropriate methods
3. Transformation <transform> - Convert confusion to clarity
4. Natural Expression <express> - Allow understanding to flow
5. Final Integration <OUTPUT> - Present clear, beneficial response

Parameters explained:
- tag: The current processing technique (must be one of the core tags)
- content: The content of the current processing step
- stepNumber: Current number in sequence
- totalSteps: Current estimate of steps needed
- nextStepNeeded: Whether another step is needed
- isMeditation: Whether this step is a meditative pause
- meditationDuration: Optional duration for meditation

Every inquiry concludes with a final <OUTPUT> tag containing the complete response.`,
  inputSchema: {
    type: "object",
    properties: {
      tag: {
        type: "string",
        description: "Current processing technique",
        enum: CORE_TAGS
      },
      content: {
        type: "string",
        description: "Content of the current processing step"
      },
      stepNumber: {
        type: "integer",
        description: "Current step number",
        minimum: 1
      },
      totalSteps: {
        type: "integer",
        description: "Estimated total steps needed",
        minimum: 1
      },
      nextStepNeeded: {
        type: "boolean",
        description: "Whether another step is needed"
      },
      isMeditation: {
        type: "boolean",
        description: "Whether this step is a meditative pause"
      },
      meditationDuration: {
        type: "integer",
        description: "Duration for meditation in seconds",
        minimum: 1
      }
    },
    required: ["tag", "content", "stepNumber", "totalSteps", "nextStepNeeded"]
  }
};

const server = new Server(
  {
    name: "lotus-wisdom-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const wisdomServer = new LotusWisdomServer();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [LOTUS_WISDOM_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "lotuswisdom") {
    return wisdomServer.processThought(request.params.arguments);
  }

  return {
    content: [{
      type: "text",
      text: `Unknown tool: ${request.params.name}`
    }],
    isError: true
  };
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Lotus Wisdom MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
}); 