#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
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
function getWisdomDomain(tag) {
    for (const [domain, tags] of Object.entries(WISDOM_DOMAINS)) {
        if (tags.includes(tag)) {
            return domain;
        }
    }
    return 'unknown';
}
class LotusWisdomServer {
    thoughtProcess = [];
    debugMode = process.env.LOTUS_DEBUG === 'true';
    // Reset for new inquiry
    resetProcess() {
        this.thoughtProcess = [];
    }
    log(message) {
        if (this.debugMode) {
            console.error(message);
        }
    }
    validateThoughtData(input) {
        const data = input;
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
            isMeditation: data.isMeditation,
            meditationDuration: data.meditationDuration,
            wisdomDomain: getWisdomDomain(data.tag)
        };
    }
    formatThought(thoughtData) {
        const { tag, stepNumber, totalSteps, content, isMeditation, wisdomDomain } = thoughtData;
        // Color coding for different wisdom domains
        let tagColor;
        let tagSymbol;
        let domainLabel = '';
        if (wisdomDomain === 'skillful_means') {
            tagColor = chalk.yellow;
            tagSymbol = '🔆';
            domainLabel = 'SKILLFUL MEANS';
        }
        else if (wisdomDomain === 'non_dual_recognition') {
            tagColor = chalk.green;
            tagSymbol = '☯️';
            domainLabel = 'NON-DUAL';
        }
        else if (wisdomDomain === 'meta_cognitive') {
            tagColor = chalk.blue;
            tagSymbol = '🧠';
            domainLabel = 'META-COGNITIVE';
        }
        else if (wisdomDomain === 'process_flow') {
            tagColor = chalk.magenta;
            tagSymbol = '🌊';
            domainLabel = 'PROCESS';
        }
        else if (wisdomDomain === 'meditation') {
            tagColor = chalk.cyan;
            tagSymbol = '🧘';
            domainLabel = 'MEDITATION';
        }
        else {
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
        }
        else {
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
    processThought(input) {
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
            // Build response object
            const response = {
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
            if (validatedInput.stepNumber === 1) {
                response.framework = {
                    domains: {
                        skillful_means: 'upaya/expedient/direct/gradual/sudden - different approaches to truth',
                        non_dual: 'recognize/transform/integrate/transcend/embody - recognition IS transformation',
                        meta_cognitive: 'examine/reflect/verify/refine/complete - mind watching itself',
                        process: 'open/engage/express - natural arc containing other approaches',
                        meditation: 'meditate - pause for insight to emerge'
                    },
                    guidance: 'Tags interpenetrate—each contains all others. Trust what each moment calls for.'
                };
            }
            // For non-final steps, return process metadata with journey awareness
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify(response, null, 2)
                    }]
            };
        }
        catch (error) {
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
    getJourneySummary() {
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
const LOTUS_WISDOM_TOOL = {
    name: "lotuswisdom",
    description: `Contemplative reasoning tool. Call iteratively with different tags until nextStepNeeded=false, then status='WISDOM_READY' signals you to speak the integrated wisdom naturally.

Tags: open/engage/express (process), examine/reflect/verify/refine/complete (meta-cognitive), recognize/transform/integrate/transcend/embody (non-dual), upaya/expedient/direct/gradual/sudden (skillful-means), meditate (pause).

Response includes wisdomDomain, journey path, and domainJourney. First call returns framework guidance.`,
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
const JOURNEY_SUMMARY_TOOL = {
    name: "lotuswisdom_summary",
    description: "Get a summary of the current contemplative journey",
    inputSchema: {
        type: "object",
        properties: {},
        required: []
    }
};
const server = new Server({
    name: "lotus-wisdom-server",
    version: "0.2.0",
}, {
    capabilities: {
        tools: {},
    },
});
const wisdomServer = new LotusWisdomServer();
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [LOTUS_WISDOM_TOOL, JOURNEY_SUMMARY_TOOL],
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "lotuswisdom") {
        return wisdomServer.processThought(request.params.arguments);
    }
    else if (request.params.name === "lotuswisdom_summary") {
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
