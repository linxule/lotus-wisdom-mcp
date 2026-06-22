import { describe, expect, it } from "vitest";
import {
  buildJourney,
  getWisdomDomain,
  parsePreviousJourney,
  processThought,
  summarizeJourney,
  type LotusInput,
  type LotusThoughtData,
} from "../src/shared/wisdom";

// Minimal LotusInput factory — keeps each test focused on the field under test.
function input(partial: Partial<LotusInput> & { tag: string }): LotusInput {
  return {
    content: "contemplating",
    stepNumber: 2,
    totalSteps: 5,
    nextStepNeeded: true,
    ...partial,
  };
}

describe("processThought", () => {
  it("returns the framework on tag='begin'", () => {
    const { result, thoughtProcess } = processThought(
      { tag: "begin", content: "", stepNumber: 1, totalSteps: 5, nextStepNeeded: true },
      [],
    );
    expect(result.status).toBe("FRAMEWORK_RECEIVED");
    expect(thoughtProcess.length).toBeGreaterThan(0);
    expect(thoughtProcess[0].tag).toBe("begin");
  });

  it("returns processing for a normal step with journey and processLength", () => {
    const { result } = processThought(
      input({ tag: "open", stepNumber: 2, nextStepNeeded: true }),
      [{ tag: "begin", content: "", stepNumber: 1, totalSteps: 5, nextStepNeeded: true, wisdomDomain: "entry" }],
    );
    expect(result.status).toBe("processing");
    expect(typeof result.journey).toBe("string");
    expect(result.journey).toBe("begin → open");
    expect(result.processLength).toBe(2);
    expect(result.currentStep).toBe("open");
    expect(result.wisdomDomain).toBe("process_flow");
  });

  it("returns MEDITATION_COMPLETE for tag='meditate'", () => {
    const { result } = processThought(
      input({ tag: "meditate", stepNumber: 2 }),
      [],
    );
    expect(result.status).toBe("MEDITATION_COMPLETE");
  });

  it("returns WISDOM_READY with finalJourney and domainJourney when nextStepNeeded=false", () => {
    const prior: LotusThoughtData[] = [
      { tag: "open", content: "", stepNumber: 1, totalSteps: 3, nextStepNeeded: true, wisdomDomain: "process_flow" },
      { tag: "examine", content: "", stepNumber: 2, totalSteps: 3, nextStepNeeded: true, wisdomDomain: "meta_cognitive" },
    ];
    const { result } = processThought(
      input({ tag: "express", stepNumber: 3, nextStepNeeded: false }),
      prior,
    );
    expect(result.status).toBe("WISDOM_READY");
    expect(result.finalJourney).toBe("open → examine → express");
    expect(result.domainJourney).toBe(
      "process_flow → meta_cognitive → process_flow",
    );
    expect(result.journeyLength).toBe(3);
  });

  it("resets accumulation when stepNumber===1", () => {
    const stale: LotusThoughtData[] = [
      { tag: "open", content: "", stepNumber: 1, totalSteps: 5, nextStepNeeded: true, wisdomDomain: "process_flow" },
      { tag: "examine", content: "", stepNumber: 2, totalSteps: 5, nextStepNeeded: true, wisdomDomain: "meta_cognitive" },
    ];
    const { result, thoughtProcess } = processThought(
      input({ tag: "recognize", stepNumber: 1, nextStepNeeded: true }),
      stale,
    );
    // Prior accumulation discarded — only the fresh step remains.
    expect(thoughtProcess.length).toBe(1);
    expect(result.journey).toBe("recognize");
    expect(result.processLength).toBe(1);
  });

  it("bumps totalSteps when stepNumber > totalSteps", () => {
    const { result } = processThought(
      input({ tag: "open", stepNumber: 7, totalSteps: 5, nextStepNeeded: true }),
      [],
    );
    expect(result.totalSteps).toBe(7);
  });
});

describe("journey round-trip", () => {
  it("recovers the same tag sequence via buildJourney → parsePreviousJourney", () => {
    const steps: LotusThoughtData[] = [
      { tag: "begin", content: "x", stepNumber: 1, totalSteps: 4, nextStepNeeded: true, wisdomDomain: "entry" },
      { tag: "open", content: "x", stepNumber: 2, totalSteps: 4, nextStepNeeded: true, wisdomDomain: "process_flow" },
      { tag: "examine", content: "x", stepNumber: 3, totalSteps: 4, nextStepNeeded: true, wisdomDomain: "meta_cognitive" },
      { tag: "integrate", content: "x", stepNumber: 4, totalSteps: 4, nextStepNeeded: true, wisdomDomain: "non_dual_recognition" },
    ];
    const { journey } = buildJourney(steps);
    const recovered = parsePreviousJourney(journey);

    expect(recovered.map((s) => s.tag)).toEqual(steps.map((s) => s.tag));
    // getWisdomDomain on each recovered tag matches the original domain.
    for (let i = 0; i < steps.length; i++) {
      expect(recovered[i].wisdomDomain).toBe(steps[i].wisdomDomain);
      expect(getWisdomDomain(recovered[i].tag)).toBe(steps[i].wisdomDomain);
    }
  });

  it("treats non-string / absent input as empty without throwing", () => {
    expect(parsePreviousJourney(undefined)).toEqual([]);
    expect(parsePreviousJourney(123 as any)).toEqual([]);
    expect(parsePreviousJourney("")).toEqual([]);
    expect(parsePreviousJourney("   ")).toEqual([]);
  });

  it("drops stray spaces and empty segments from a malformed journey string", () => {
    const recovered = parsePreviousJourney("  open →  → examine →  ");
    expect(recovered.map((s) => s.tag)).toEqual(["open", "examine"]);
  });
});

describe("summarizeJourney", () => {
  it("returns a JOURNEY_SUMMARY with length and steps array", () => {
    const steps: LotusThoughtData[] = [
      { tag: "open", content: "first contemplation", stepNumber: 1, totalSteps: 2, nextStepNeeded: true, wisdomDomain: "process_flow" },
      { tag: "express", content: "final", stepNumber: 2, totalSteps: 2, nextStepNeeded: false, wisdomDomain: "process_flow" },
    ];
    const result = summarizeJourney(steps);
    expect(result.status).toBe("JOURNEY_SUMMARY");
    expect(result.journeyLength).toBe(2);
    expect(Array.isArray(result.steps)).toBe(true);
    expect((result.steps as unknown[]).length).toBe(2);
  });
});
