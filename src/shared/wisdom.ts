// Single source of truth for Lotus Wisdom domain logic.
//
// Pure, transport-agnostic functions imported by BOTH the local stdio server
// (index.ts) and the Cloudflare Worker (worker/src/index.ts). Keeping the logic
// here is what prevents the two transports from drifting apart: validation,
// journey reconstruction, and response shaping are defined exactly once.
//
// No Node- or Worker-specific imports — keep this file portable.

// --- Wisdom domains -------------------------------------------------------

export const WISDOM_DOMAINS: Record<string, string[]> = {
  entry: ["begin"], // Always call first to receive the framework
  skillful_means: ["upaya", "expedient", "direct", "gradual", "sudden"],
  non_dual_recognition: [
    "recognize",
    "transform",
    "integrate",
    "transcend",
    "embody",
  ],
  meta_cognitive: ["examine", "reflect", "verify", "refine", "complete"],
  process_flow: ["open", "engage", "express"],
  meditation: ["meditate"],
};

// Flattened tag list used for validation / enum.
export const CORE_TAGS: string[] = Object.values(WISDOM_DOMAINS).flat();

export function getWisdomDomain(tag: string): string {
  for (const [domain, tags] of Object.entries(WISDOM_DOMAINS)) {
    if (tags.includes(tag)) return domain;
  }
  return "unknown";
}

// --- Types ----------------------------------------------------------------

export interface LotusThoughtData {
  tag: string;
  content: string;
  stepNumber: number;
  totalSteps: number;
  nextStepNeeded: boolean;
  isMeditation?: boolean;
  meditationDuration?: number;
  wisdomDomain?: string;
}

export interface LotusInput {
  tag: string;
  content: string;
  stepNumber: number;
  totalSteps: number;
  nextStepNeeded: boolean;
  isMeditation?: boolean;
  meditationDuration?: number;
  previousJourney?: string;
}

// Defaults applied to a `begin` step (and used by the zod schema in tool-defs).
// Defined once so the stdio and Worker transports apply identical defaults.
export const INPUT_DEFAULTS = {
  content: "Beginning contemplative journey",
  stepNumber: 1,
  totalSteps: 5,
  nextStepNeeded: true,
} as const;

export type LotusResult = Record<string, unknown> & { status: string };

// --- Framework text (returned on tag='begin') -----------------------------

export function buildFrameworkResponse(content: string): LotusResult {
  return {
    status: "FRAMEWORK_RECEIVED",
    contemplation: content,
    welcome:
      "Welcome to the Lotus Wisdom framework. Read this before continuing your contemplative journey.",
    philosophy: {
      core: "The Lotus Sutra teaches that there are many skillful means to reach the same truth. These tags are not rigid steps but different aspects of wisdom that interpenetrate and respond to what each moment needs.",
      essence:
        "The wisdom channels itself through your choices. Each step contains all others—when you truly recognize, you are already transforming. The tool simply mirrors your journey without judgment.",
      trust:
        "Trust what each moment calls for. The path reveals itself in the walking.",
    },
    domains: {
      process_flow: {
        tags: ["open", "engage", "express"],
        spirit:
          "The natural arc of inquiry. Opening creates space for what wants to emerge. Engagement explores with curiosity and presence. Expression shares what arose—not as conclusion, but as offering.",
        role: "A container that can hold any of the other approaches within it.",
      },
      skillful_means: {
        tags: ["upaya", "expedient", "direct", "gradual", "sudden"],
        spirit:
          "Many ways lead to understanding. Sometimes direct pointing cuts through confusion instantly. Sometimes patient, gradual unfolding is what serves. Upaya is the art of meeting each situation with what it actually needs.",
        role: "Different approaches to truth—the medicine that fits the illness.",
      },
      non_dual_recognition: {
        tags: ["recognize", "transform", "integrate", "transcend", "embody"],
        spirit:
          "Awakening to what is already present. Recognition and transformation are not separate—to truly see IS already to change. Integration weaves apparent opposites. Transcendence sees beyond the frame. Embodiment lives the understanding.",
        role: "The alchemical heart of the journey—where seeing becomes being.",
      },
      meta_cognitive: {
        tags: ["examine", "reflect", "verify", "refine", "complete"],
        spirit:
          "The mind watching its own understanding unfold. Gentle examination, not harsh judgment. Reflection that deepens rather than distances. Verification that grounds insight in reality. Refinement that polishes without force.",
        role: "The witness consciousness that ensures clarity and completeness.",
      },
      meditation: {
        tags: ["meditate"],
        spirit:
          "Pause. Let thoughts settle like silt in still water. Insight often emerges from stillness, not effort. The gap between thoughts holds wisdom that activity cannot reach.",
        role: "Sacred pause—creating space for what cannot be grasped to be received.",
      },
    },
    patterns: {
      note: "Common flows (not rules—let the inquiry guide you):",
      suggestions: [
        "Opening often involves open, recognize, or examine—creating space and initial contact",
        "Engagement might use direct, gradual, or upaya approaches—working with what arose",
        "Integration can happen through integrate, transcend, or sudden insight—weaving understanding",
        "Completion often flows through express, embody, or complete—bringing forth and grounding",
      ],
      flexibility:
        "These patterns are descriptive, not prescriptive. Some inquiries need only two steps. Others spiral through many. Trust what wants to happen.",
    },
    guidance: {
      interpenetration:
        "These domains interpenetrate—each step contains echoes of all others. A moment of recognition may also be transformation. An examination may suddenly become meditation.",
      uncertainty:
        "When uncertain, sit with the uncertainty. The fog is not an obstacle; it is part of the journey. Not-knowing is its own form of wisdom.",
      workflow:
        "Call lotuswisdom iteratively with different tags. The tool processes your contemplation internally—do NOT output wisdom until you receive status=WISDOM_READY. Then speak naturally in your own voice.",
      next: 'Proceed with stepNumber: 2 using any tag that feels right (often "open" or "examine" to start).',
    },
    parameters: {
      tag: "The current processing technique—choose from any wisdom domain",
      content:
        "Your contemplation for this step—what you are thinking, seeing, or understanding",
      stepNumber: "Current step in your journey (this begin step is 1)",
      totalSteps: "Your estimate of total steps needed (can adjust as you go)",
      nextStepNeeded: "Set true to continue, false when ready to complete",
      isMeditation:
        "Set true when using the meditate tag for a contemplative pause",
      meditationDuration: "Optional seconds (1-10) for meditation pauses",
      previousJourney:
        "Pass the journey string from the previous response to maintain visual continuity (e.g. the journey field value).",
    },
    responses: {
      processing: "Normal steps return status=processing with journey tracking",
      wisdomDomain: "Which domain your current tag belongs to",
      journey:
        'Your complete tag path so far (e.g., "open → examine → direct → integrate")',
      domainJourney:
        'Movement between wisdom domains (e.g., "process_flow → meta_cognitive → skillful_means")',
      meditation:
        "The meditate tag returns status=MEDITATION_COMPLETE with a prompt asking what emerged from stillness",
      completion:
        "When nextStepNeeded=false, you receive status=WISDOM_READY—then speak the final wisdom naturally in your own voice",
    },
    whenToUse: [
      "Breaking down complex problems requiring multi-faceted understanding",
      "Questions that benefit from both direct and gradual approaches",
      "Problems where apparent contradictions need integration",
      "Situations requiring both analytical and intuitive understanding",
      "Tasks that benefit from meditative pauses to allow insight",
      "Questions containing their own inherent wisdom",
    ],
  };
}

// --- Journey helpers ------------------------------------------------------

export function buildJourney(steps: LotusThoughtData[]): {
  journey: string;
  domainJourney: string;
} {
  const journey = steps.map((s) => s.tag).join(" → ");
  const domainJourney = steps
    .map((s) => s.wisdomDomain)
    .filter((d, i, a) => i === 0 || d !== a[i - 1])
    .join(" → ");
  return { journey, domainJourney };
}

/**
 * Reconstruct a thought-process array from a previously-returned journey string.
 * Enables stateless/sessionless clients (e.g. claude.ai Connectors) to maintain
 * continuity by passing the prior journey forward.
 *
 * Robust to malformed input: a non-string is treated as absent rather than
 * throwing. Empty / whitespace-only segments are dropped.
 */
export function parsePreviousJourney(
  previousJourney?: unknown,
  totalSteps?: number,
): LotusThoughtData[] {
  if (typeof previousJourney !== "string" || previousJourney.trim() === "") {
    return [];
  }

  const prevTags = previousJourney
    .split("→")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const resolvedTotalSteps = Math.max(
    totalSteps ?? prevTags.length,
    prevTags.length,
  );

  return prevTags.map((tag, index) => ({
    tag,
    content: "",
    stepNumber: index + 1,
    totalSteps: resolvedTotalSteps,
    nextStepNeeded: true,
    wisdomDomain: getWisdomDomain(tag),
  }));
}

// --- Core step processing -------------------------------------------------

/**
 * Process a single contemplation step. Pure: takes the prior thought process,
 * returns the response object plus the next thought process.
 *
 * - Stateful transports (stdio) thread an accumulating array across calls.
 * - Stateless transports (Worker) pass [] and rely on `previousJourney`
 *   reconstruction inside this function.
 *
 * Returns `result` as a plain object so callers can both stringify it for the
 * text content block AND surface it as `structuredContent`.
 */
export function processThought(
  input: LotusInput,
  thoughtProcess: LotusThoughtData[],
): { result: LotusResult; thoughtProcess: LotusThoughtData[] } {
  // Auto-fill defaults for 'begin' (defensive — the schema also defaults these).
  if (input.tag === "begin") {
    input.content = input.content || INPUT_DEFAULTS.content;
    input.stepNumber = input.stepNumber || INPUT_DEFAULTS.stepNumber;
    input.totalSteps = input.totalSteps || INPUT_DEFAULTS.totalSteps;
    input.nextStepNeeded = input.nextStepNeeded ?? INPUT_DEFAULTS.nextStepNeeded;
  }

  // A fresh journey (step 1) resets accumulated state.
  let process = input.stepNumber === 1 ? [] : thoughtProcess;

  // Reconstruct from previousJourney when state is empty (stateless clients).
  // Skipped on step 1: a well-formed journey always begins with tag='begin' at
  // step 1, so a step-1 non-begin call starts fresh rather than double-counting
  // a reconstructed-then-appended step (journeyLength vs stepNumber disagreeing).
  if (
    process.length === 0 &&
    input.previousJourney &&
    input.tag !== "begin" &&
    input.stepNumber !== 1
  ) {
    process = parsePreviousJourney(input.previousJourney, input.totalSteps);
  }

  // Never let stepNumber exceed totalSteps.
  const totalSteps = Math.max(input.totalSteps, input.stepNumber);

  const wisdomDomain = getWisdomDomain(input.tag);
  const step: LotusThoughtData = {
    tag: input.tag,
    content: input.content,
    stepNumber: input.stepNumber,
    totalSteps,
    nextStepNeeded: input.nextStepNeeded,
    isMeditation: input.isMeditation,
    meditationDuration: input.meditationDuration,
    wisdomDomain,
  };
  const nextProcess = [...process, step];

  // begin → return the full framework
  if (input.tag === "begin") {
    return {
      result: buildFrameworkResponse(input.content),
      thoughtProcess: nextProcess,
    };
  }

  // meditate → contemplative pause
  if (input.tag === "meditate") {
    const { journey } = buildJourney(nextProcess);
    return {
      result: {
        status: "MEDITATION_COMPLETE",
        contemplation: input.content,
        duration: input.meditationDuration || 3,
        prompt: "What insights emerged during the pause?",
        instruction: "Continue with what arose from stillness",
        stepNumber: input.stepNumber,
        totalSteps,
        journey,
      },
      thoughtProcess: nextProcess,
    };
  }

  // nextStepNeeded=false → journey complete
  if (!input.nextStepNeeded) {
    const { journey, domainJourney } = buildJourney(nextProcess);
    return {
      result: {
        status: "WISDOM_READY",
        contemplation: input.content,
        processComplete: true,
        finalStep: input.tag,
        instruction:
          input.tag === "express"
            ? "NOW_SPEAK_THE_WISDOM_NATURALLY"
            : "PROCESS_COMPLETE_SPEAK_WISDOM",
        totalSteps: input.stepNumber,
        journeyLength: nextProcess.length,
        finalJourney: journey,
        domainJourney,
      },
      thoughtProcess: nextProcess,
    };
  }

  // Normal processing step
  const { journey, domainJourney } = buildJourney(nextProcess);
  return {
    result: {
      status: "processing",
      contemplation: input.content,
      currentStep: input.tag,
      wisdomDomain,
      journey,
      domainJourney,
      stepNumber: input.stepNumber,
      totalSteps,
      nextStepNeeded: input.nextStepNeeded,
      processLength: nextProcess.length,
    },
    thoughtProcess: nextProcess,
  };
}

// --- Journey summary ------------------------------------------------------

export function summarizeJourney(steps: LotusThoughtData[]): LotusResult {
  const { domainJourney } = buildJourney(steps);
  return {
    status: "JOURNEY_SUMMARY",
    journeyLength: steps.length,
    domainJourney,
    steps: steps.map((s) => ({
      tag: s.tag,
      domain: s.wisdomDomain,
      stepNumber: s.stepNumber,
      brief: s.content ? s.content.substring(0, 50) + "..." : "",
    })),
  };
}

/**
 * Reduce a result to a schema-conformant structuredContent payload.
 *
 * The MCP SDK validates structuredContent against the tool's outputSchema but
 * transmits the RAW object (it does not re-emit the stripped value). The 'begin'
 * framework is deliberately text-only, so we flatten it here to the fields the
 * outputSchema advertises; the full framework rides in the text content block.
 */
export function structuredContentFor(result: LotusResult): LotusResult {
  if (result.status === "FRAMEWORK_RECEIVED") {
    return {
      status: result.status,
      contemplation: (result.contemplation as string) ?? "",
      welcome: (result.welcome as string) ?? "",
    };
  }
  return result;
}
