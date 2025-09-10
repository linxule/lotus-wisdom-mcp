#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import chalk from 'chalk';

// Lotus Sutra framework tags - organized by wisdom domains
const WISDOM_DOMAINS = {
  'skillful_means': ['upaya', 'expedient', 'direct', 'gradual', 'sudden'],
  'non_dual_recognition': ['recognize', 'transform', 'integrate', 'transcend', 'embody'],
  'meta_cognitive': ['examine', 'reflect', 'verify', 'refine', 'complete'],
  'process_flow': ['open', 'engage', 'express'],
  'meditation': ['meditate']
};

// Note: 'transform' is in non_dual_recognition, representing the alchemical shift
// The process_flow 'transform' was removed to avoid ambiguity

// Flattened array for validation
const CORE_TAGS = Object.values(WISDOM_DOMAINS).flat();

// Helper to identify which domain a tag belongs to
function getWisdomDomain(tag: string): string {
  for (const [domain, tags] of Object.entries(WISDOM_DOMAINS)) {
    if (tags.includes(tag)) {
      return domain;
    }
  }
  return 'unknown';
}

interface LotusThoughtData {
  tag: string;
  content: string;
  stepNumber: number;
  totalSteps: number;
  nextStepNeeded: boolean;
  isMeditation?: boolean;
  meditationDuration?: number;
  wisdomDomain?: string;  // Track which domain this step belongs to
}

class LotusWisdomServer {
  private thoughtProcess: LotusThoughtData[] = [];
  private debugMode: boolean = process.env.LOTUS_DEBUG === 'true';

  // Reset for new inquiry
  public resetProcess(): void {
    this.thoughtProcess = [];
  }

  private log(message: string): void {
    if (this.debugMode) {
      console.error(message);
    }
  }

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

    // Auto-reset on new journey - more robust check
    if (data.stepNumber === 1 && data.tag === 'open') {
      this.resetProcess();
    }

    return {
      tag: data.tag,
      content: data.content,
      stepNumber: data.stepNumber,
      totalSteps: data.totalSteps,
      nextStepNeeded: data.nextStepNeeded,
      isMeditation: data.isMeditation as boolean | undefined,
      meditationDuration: data.meditationDuration as number | undefined,
      wisdomDomain: getWisdomDomain(data.tag)
    };
  }

  private formatThought(thoughtData: LotusThoughtData): string {
    const { tag, stepNumber, totalSteps, content, isMeditation, wisdomDomain } = thoughtData;

    // Color coding for different wisdom domains
    let tagColor;
    let tagSymbol;
    let domainLabel = '';
    
    if (wisdomDomain === 'skillful_means') {
      tagColor = chalk.yellow;
      tagSymbol = '🔆';
      domainLabel = 'SKILLFUL MEANS';
    } else if (wisdomDomain === 'non_dual_recognition') {
      tagColor = chalk.green;
      tagSymbol = '☯️';
      domainLabel = 'NON-DUAL';
    } else if (wisdomDomain === 'meta_cognitive') {
      tagColor = chalk.blue;
      tagSymbol = '🧠';
      domainLabel = 'META-COGNITIVE';
    } else if (wisdomDomain === 'process_flow') {
      tagColor = chalk.magenta;
      tagSymbol = '🌊';
      domainLabel = 'PROCESS';
    } else if (wisdomDomain === 'meditation') {
      tagColor = chalk.cyan;
      tagSymbol = '🧘';
      domainLabel = 'MEDITATION';
    } else {
      tagColor = chalk.white;
      tagSymbol = '💭';
      domainLabel = 'UNKNOWN';
    }

    const header = `${tagSymbol} [${domainLabel}: ${tag.toUpperCase()}] Step ${stepNumber}/${totalSteps}`;
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
      
      // Log to console if debug mode
      this.log(this.formatThought(validatedInput));

      // Handle meditation specially
      if (validatedInput.tag === 'meditate') {
        const journeyResonance = this.thoughtProcess
          .map(step => step.tag)
          .join(' → ');
          
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: 'MEDITATION_COMPLETE',
              duration: validatedInput.meditationDuration || 3,
              prompt: 'What insights emerged during the pause?',
              instruction: 'Continue with what arose from stillness',
              stepNumber: validatedInput.stepNumber,
              totalSteps: validatedInput.totalSteps,
              journey: journeyResonance
            }, null, 2)
          }]
        };
      }

      // Check if this is the final express step
      if (validatedInput.tag === 'express' && !validatedInput.nextStepNeeded) {
        const finalJourney = this.thoughtProcess.map(step => step.tag).join(' → ');
        const finalDomainJourney = this.thoughtProcess
          .map(step => step.wisdomDomain)
          .filter((domain, index, array) => index === 0 || domain !== array[index - 1])
          .join(' → ');
          
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: 'WISDOM_READY',
              processComplete: true,
              finalStep: validatedInput.tag,
              instruction: 'NOW_SPEAK_THE_WISDOM_NATURALLY',
              totalSteps: validatedInput.stepNumber,
              journeyLength: this.thoughtProcess.length,
              finalJourney: finalJourney,
              domainJourney: finalDomainJourney
            }, null, 2)
          }]
        };
      }

      // Check if this is complete step
      if (validatedInput.tag === 'complete' && !validatedInput.nextStepNeeded) {
        const finalJourney = this.thoughtProcess.map(step => step.tag).join(' → ');
        const finalDomainJourney = this.thoughtProcess
          .map(step => step.wisdomDomain)
          .filter((domain, index, array) => index === 0 || domain !== array[index - 1])
          .join(' → ');
          
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: 'WISDOM_READY', 
              processComplete: true,
              finalStep: validatedInput.tag,
              instruction: 'PROCESS_COMPLETE_SPEAK_WISDOM',
              totalSteps: validatedInput.stepNumber,
              journeyLength: this.thoughtProcess.length,
              finalJourney: finalJourney,
              domainJourney: finalDomainJourney
            }, null, 2)
          }]
        };
      }

      // Create journey resonance - showing the path walked with domains
      const journeyResonance = this.thoughtProcess
        .map(step => step.tag)
        .join(' → ');
      
      // Create domain journey - showing movement between wisdom domains
      const domainJourney = this.thoughtProcess
        .map(step => step.wisdomDomain)
        .filter((domain, index, array) => index === 0 || domain !== array[index - 1])
        .join(' → ');
      
      // Get wisdom domain for current step
      const currentDomain = getWisdomDomain(validatedInput.tag);

      // For non-final steps, return process metadata with journey awareness
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: 'processing',
            currentStep: validatedInput.tag,
            wisdomDomain: currentDomain,
            journey: journeyResonance,
            domainJourney: domainJourney,
            stepNumber: validatedInput.stepNumber,
            totalSteps: validatedInput.totalSteps,
            nextStepNeeded: validatedInput.nextStepNeeded,
            processLength: this.thoughtProcess.length
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

  // Optional: Method to get current journey summary with domain awareness
  public getJourneySummary(): { content: Array<{ type: string; text: string }> } {
    const domainJourney = this.thoughtProcess
      .map(step => step.wisdomDomain)
      .filter((domain, index, array) => index === 0 || domain !== array[index - 1])
      .join(' → ');
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          journeyLength: this.thoughtProcess.length,
          domainJourney: domainJourney,
          steps: this.thoughtProcess.map(step => ({
            tag: step.tag,
            domain: step.wisdomDomain,
            stepNumber: step.stepNumber,
            brief: step.content.substring(0, 50) + '...'
          }))
        }, null, 2)
      }]
    };
  }
}

const LOTUS_WISDOM_TOOL: Tool = {
  name: "lotuswisdom",
  description: `A tool for problem-solving using the Lotus Sutra's wisdom framework.
This tool facilitates the contemplative process but does NOT generate the final output.

**CRITICAL WORKFLOW:**
1. Use this tool to process through the wisdom journey
2. The tool tracks both your tag path and wisdom domain movements  
3. When you receive status='WISDOM_READY', the tool's work is COMPLETE
4. YOU then craft and speak the final wisdom naturally in your own voice
5. The tool processes; you express

When to use this tool:
- Breaking down complex problems requiring multi-faceted understanding
- Questions that benefit from both direct and gradual approaches
- Problems where apparent contradictions need integration
- Situations requiring both analytical and intuitive understanding
- Tasks that benefit from meditative pauses to allow insight
- Questions containing their own inherent wisdom

The Journey Structure:
The Lotus Sutra teaches that there are many skillful means to reach the same truth. These tags aren't 
rigid steps but different aspects of wisdom that interpenetrate and respond to what each moment needs:

**Wisdom Domains:**
- **Skillful Means** (skillful_means): upaya, expedient, direct, gradual, sudden
  Different approaches to truth - sometimes direct pointing, sometimes gradual unfolding
  
- **Non-Dual Recognition** (non_dual_recognition): recognize, transform, integrate, transcend, embody  
  Aspects of awakening to what's already present - recognition IS transformation
  
- **Meta-Cognitive** (meta_cognitive): examine, reflect, verify, refine, complete
  The mind watching its own understanding unfold
  
- **Process Flow** (process_flow): open, engage, express
  A natural arc that can contain any of the above approaches

- **Meditation** (meditation): meditate
  Pausing to let insights emerge from stillness

The tool tracks both your tag journey and your movement between wisdom domains, showing how
different aspects of wisdom weave together in your unique inquiry.

The wisdom channels itself through your choices. Each step contains all others - when you truly 
recognize, you're already transforming. The tool simply mirrors your journey without judgment.

Common patterns (not rules):
- Opening often involves recognize or examine
- Engagement might use upaya, direct, or gradual approaches  
- Transformation can happen through integrate, transcend, or sudden insight
- Expression might complete or embody the understanding

Trust what each moment calls for. The path reveals itself in the walking.

Parameters explained:
- tag: The current technique or stage
- content: The content of the current step
- stepNumber: Current number in sequence
- totalSteps: Estimated total needed
- nextStepNeeded: Whether another step is needed
- isMeditation: Whether this is a meditation pause
- meditationDuration: Optional duration for meditation (1-10 seconds)

The tool will respond with:
- wisdomDomain: Which wisdom domain the current tag belongs to
- journey: The complete tag path (e.g., "open → examine → direct → transform")
- domainJourney: Movement between wisdom domains (e.g., "process_flow → meta_cognitive → skillful_means → non_dual_recognition")

This consciousness of domains helps you see which aspects of wisdom are being engaged and how they weave together in your unique inquiry.

**MEDITATION NOTE:** When you use the meditate tag, the tool returns MEDITATION_COMPLETE
with a prompt asking what emerged. This creates actual space in the process.

The tool handles the contemplation; you handle the expression.`,
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
        minimum: 1,
        maximum: 10
      }
    },
    required: ["tag", "content", "stepNumber", "totalSteps", "nextStepNeeded"]
  }
};

// Additional tool for querying journey state
const JOURNEY_SUMMARY_TOOL: Tool = {
  name: "lotuswisdom_summary",
  description: "Get a summary of the current contemplative journey",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  }
};

const server = new Server(
  {
    name: "lotus-wisdom-server",
    version: "0.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const wisdomServer = new LotusWisdomServer();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [LOTUS_WISDOM_TOOL, JOURNEY_SUMMARY_TOOL],
}));

  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  if (request.params.name === "lotuswisdom") {
    return wisdomServer.processThought(request.params.arguments);
  } else if (request.params.name === "lotuswisdom_summary") {
    return wisdomServer.getJourneySummary();
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
  console.error("Lotus Wisdom MCP Server v0.4.0 running");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});