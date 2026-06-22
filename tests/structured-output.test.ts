import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  processThought,
  summarizeJourney,
  type LotusInput,
  type LotusResult,
  type LotusThoughtData,
} from "../src/shared/wisdom";
import { lotusOutputShape, summaryOutputShape } from "../src/shared/tool-defs";

// structuredContent fidelity invariant: z.object() STRIPS unknown keys. So if a
// result variant emits a field absent from the output schema, it is silently
// dropped from structuredContent. These tests assert the output schema is a
// complete superset of every non-'begin' result — no field lost on parse.
function assertSuperset(shape: z.ZodRawShape, result: LotusResult) {
  const parsed = z.object(shape).parse(result);
  for (const key of Object.keys(result)) {
    expect(parsed, `output schema dropped field "${key}"`).toHaveProperty(key);
    expect((parsed as Record<string, unknown>)[key]).toEqual(
      (result as Record<string, unknown>)[key],
    );
  }
}

function input(partial: Partial<LotusInput> & { tag: string }): LotusInput {
  return {
    content: "contemplating",
    stepNumber: 2,
    totalSteps: 5,
    nextStepNeeded: true,
    ...partial,
  };
}

const prior: LotusThoughtData[] = [
  { tag: "open", content: "", stepNumber: 1, totalSteps: 5, nextStepNeeded: true, wisdomDomain: "process_flow" },
];

describe("structured output superset fidelity", () => {
  it("processing variant survives lotusOutputShape parse intact", () => {
    const { result } = processThought(
      input({ tag: "examine", stepNumber: 2, nextStepNeeded: true }),
      prior,
    );
    expect(result.status).toBe("processing");
    assertSuperset(lotusOutputShape, result);
  });

  it("MEDITATION_COMPLETE variant survives lotusOutputShape parse intact", () => {
    const { result } = processThought(
      input({ tag: "meditate", stepNumber: 2, meditationDuration: 5 }),
      prior,
    );
    expect(result.status).toBe("MEDITATION_COMPLETE");
    assertSuperset(lotusOutputShape, result);
  });

  it("WISDOM_READY variant survives lotusOutputShape parse intact", () => {
    const { result } = processThought(
      input({ tag: "express", stepNumber: 2, nextStepNeeded: false }),
      prior,
    );
    expect(result.status).toBe("WISDOM_READY");
    assertSuperset(lotusOutputShape, result);
  });

  it("summarizeJourney survives summaryOutputShape parse intact", () => {
    const result = summarizeJourney([
      { tag: "open", content: "hi", stepNumber: 1, totalSteps: 1, nextStepNeeded: false, wisdomDomain: "process_flow" },
    ]);
    expect(result.status).toBe("JOURNEY_SUMMARY");
    assertSuperset(summaryOutputShape, result);
  });

  it("'begin' framework keeps status/contemplation/welcome through lotusOutputShape", () => {
    const { result } = processThought(
      { tag: "begin", content: "starting", stepNumber: 1, totalSteps: 5, nextStepNeeded: true },
      [],
    );
    const parsed = z.object(lotusOutputShape).parse(result);
    expect(parsed.status).toBe("FRAMEWORK_RECEIVED");
    expect(parsed.contemplation).toBe("starting");
    expect(typeof parsed.welcome).toBe("string");
  });
});
