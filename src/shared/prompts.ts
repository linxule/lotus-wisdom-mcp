// MCP Prompts — slash-command / scaffolding entry points for a guided
// contemplative session. Registered identically on both transports.

import { z } from "zod";

// Structural type with METHOD syntax (bivariant parameter) so this accepts
// either transport's separately-bundled McpServer without importing the SDK
// type — avoids the "two copies of @modelcontextprotocol/sdk" private-property
// clash between the root (stdio) and worker bundles.
interface PromptHost {
  registerPrompt(name: string, config: unknown, cb: unknown): unknown;
}

export function registerLotusPrompts(server: PromptHost): void {
  server.registerPrompt(
    "contemplate",
    {
      title: "Contemplate a question",
      description:
        "Scaffold a Lotus Wisdom contemplative inquiry into a question or problem.",
      argsSchema: {
        question: z
          .string()
          .describe("The question or problem to contemplate"),
      },
    },
    (args: { question?: string }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Use the \`lotuswisdom\` tool to contemplate the following. Start with tag='begin' to receive the framework, then iterate with contemplation tags. Do not state the final wisdom until a step returns status='WISDOM_READY', then speak it naturally in your own voice.\n\nQuestion: ${args.question ?? ""}`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "deep-inquiry",
    {
      title: "Deep multi-step inquiry",
      description:
        "Begin a longer contemplative inquiry that moves deliberately across wisdom domains (process → meta-cognitive → non-dual → meditation).",
      argsSchema: {
        topic: z.string().describe("The topic or tension to explore deeply"),
      },
    },
    (args: { topic?: string }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Conduct a deep contemplative inquiry into the following using the \`lotuswisdom\` tool. Begin with tag='begin', then move deliberately: open the question, examine it, allow recognition and integration, pause to meditate where it serves, and only express the wisdom once a step returns status='WISDOM_READY'.\n\nTopic: ${args.topic ?? ""}`,
          },
        },
      ],
    }),
  );
}
