#!/usr/bin/env node

import express from 'express';
import { randomUUID } from 'node:crypto';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  isInitializeRequest
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
  wisdomDomain?: string;
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

    // Auto-reset on any new journey (step 1 indicates fresh start)
    if (data.stepNumber === 1) {
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

      // Create journey resonance
      const journeyResonance = this.thoughtProcess
        .map(step => step.tag)
        .join(' → ');

      const domainJourney = this.thoughtProcess
        .map(step => step.wisdomDomain)
        .filter((domain, index, array) => index === 0 || domain !== array[index - 1])
        .join(' → ');

      const currentDomain = getWisdomDomain(validatedInput.tag);

      // Build response object
      const response: Record<string, unknown> = {
        status: 'processing',
        currentStep: validatedInput.tag,
        wisdomDomain: currentDomain,
        journey: journeyResonance,
        domainJourney: domainJourney,
        stepNumber: validatedInput.stepNumber,
        totalSteps: validatedInput.totalSteps,
        nextStepNeeded: validatedInput.nextStepNeeded,
        processLength: this.thoughtProcess.length
      };

      // Include framework guidance on first step (just-in-time teaching)
      // This contains the full richness that was in the original description
      if (validatedInput.stepNumber === 1) {
        response.framework = {
          welcome: 'You have begun a contemplative journey. There is no wrong path here—only the path that unfolds.',

          philosophy: {
            core: 'The Lotus Sutra teaches that there are many skillful means to reach the same truth. These tags are not rigid steps but different aspects of wisdom that interpenetrate and respond to what each moment needs.',
            essence: 'The wisdom channels itself through your choices. Each step contains all others—when you truly recognize, you are already transforming. The tool simply mirrors your journey without judgment.',
            trust: 'Trust what each moment calls for. The path reveals itself in the walking.'
          },

          domains: {
            process_flow: {
              tags: ['open', 'engage', 'express'],
              spirit: 'The natural arc of inquiry. Opening creates space for what wants to emerge. Engagement explores with curiosity and presence. Expression shares what arose—not as conclusion, but as offering.',
              role: 'A container that can hold any of the other approaches within it.'
            },
            skillful_means: {
              tags: ['upaya', 'expedient', 'direct', 'gradual', 'sudden'],
              spirit: 'Many ways lead to understanding. Sometimes direct pointing cuts through confusion instantly. Sometimes patient, gradual unfolding is what serves. Upaya is the art of meeting each situation with what it actually needs.',
              role: 'Different approaches to truth—the medicine that fits the illness.'
            },
            non_dual_recognition: {
              tags: ['recognize', 'transform', 'integrate', 'transcend', 'embody'],
              spirit: 'Awakening to what is already present. Recognition and transformation are not separate—to truly see IS already to change. Integration weaves apparent opposites. Transcendence sees beyond the frame. Embodiment lives the understanding.',
              role: 'The alchemical heart of the journey—where seeing becomes being.'
            },
            meta_cognitive: {
              tags: ['examine', 'reflect', 'verify', 'refine', 'complete'],
              spirit: 'The mind watching its own understanding unfold. Gentle examination, not harsh judgment. Reflection that deepens rather than distances. Verification that grounds insight in reality. Refinement that polishes without force.',
              role: 'The witness consciousness that ensures clarity and completeness.'
            },
            meditation: {
              tags: ['meditate'],
              spirit: 'Pause. Let thoughts settle like silt in still water. Insight often emerges from stillness, not effort. The gap between thoughts holds wisdom that activity cannot reach.',
              role: 'Sacred pause—creating space for what cannot be grasped to be received.'
            }
          },

          patterns: {
            note: 'Common flows (not rules—let the inquiry guide you):',
            suggestions: [
              'Opening often involves open, recognize, or examine—creating space and initial contact',
              'Engagement might use direct, gradual, or upaya approaches—working with what arose',
              'Integration can happen through integrate, transcend, or sudden insight—weaving understanding',
              'Completion often flows through express, embody, or complete—bringing forth and grounding'
            ],
            flexibility: 'These patterns are descriptive, not prescriptive. Some inquiries need only two steps. Others spiral through many. Trust what wants to happen.'
          },

          guidance: {
            interpenetration: 'These domains interpenetrate—each step contains echoes of all others. A moment of recognition may also be transformation. An examination may suddenly become meditation.',
            uncertainty: 'When uncertain, sit with the uncertainty. The fog is not an obstacle; it is part of the journey. Not-knowing is its own form of wisdom.',
            closing: 'Trust what arises. The tool processes your contemplation; you speak the wisdom that emerges.'
          }
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(response, null, 2)
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
  description: `Contemplative reasoning framework. Use for complex problems needing multi-perspective understanding, contradictions requiring integration, or questions holding their own wisdom.

**Workflow:** Call iteratively with different tags. The tool processes your contemplation internally—do NOT output wisdom until status='WISDOM_READY', then speak naturally in your own voice.

**Tags:** open/engage/express (process), examine/reflect/verify/refine/complete (meta-cognitive), recognize/transform/integrate/transcend/embody (non-dual), upaya/expedient/direct/gradual/sudden (skillful-means), meditate (pauses, returns MEDITATION_COMPLETE).

First call returns framework guidance. Response tracks wisdomDomain and journey path.`,
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

const JOURNEY_SUMMARY_TOOL: Tool = {
  name: "lotuswisdom_summary",
  description: "Get a summary of the current contemplative journey",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  }
};

// Create server and wisdom instance for a session
function createMCPServer(): { server: Server; wisdomServer: LotusWisdomServer } {
  const server = new Server(
    {
      name: "lotus-wisdom-server",
      version: "0.3.0",
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

  return { server, wisdomServer };
}

// Express app setup
const app = express();
app.use(express.json());

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Handle POST requests for client-to-server communication
app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    // Reuse existing transport
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New initialization request
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        transports[sessionId] = transport;
        console.log(`Session initialized: ${sessionId}`);
      }
    });

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        console.log(`Session closed: ${transport.sessionId}`);
        delete transports[transport.sessionId];
      }
    };

    // Create MCP server instance for this session
    const { server } = createMCPServer();
    await server.connect(transport);
  } else {
    // Invalid request
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    });
    return;
  }

  // Handle the request
  await transport.handleRequest(req, res, req.body);
});

// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

// Handle DELETE requests for session termination
app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

// Start the HTTP server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Lotus Wisdom MCP HTTP Server v0.3.0 listening on port ${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}/mcp`);
});
