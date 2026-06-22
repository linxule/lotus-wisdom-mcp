import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  processThought,
  structuredContentFor,
  buildFrameworkResponse,
} from "../src/shared/wisdom";
import { lotusInputShape } from "../src/shared/tool-defs";

describe("structuredContentFor", () => {
  it("flattens the begin framework to status/contemplation/welcome", () => {
    const sc = structuredContentFor(buildFrameworkResponse("hello"));
    expect(Object.keys(sc).sort()).toEqual([
      "contemplation",
      "status",
      "welcome",
    ]);
    expect(sc.status).toBe("FRAMEWORK_RECEIVED");
    // nested framework objects must NOT ride along in structuredContent
    expect((sc as Record<string, unknown>).philosophy).toBeUndefined();
    expect((sc as Record<string, unknown>).domains).toBeUndefined();
    expect((sc as Record<string, unknown>).whenToUse).toBeUndefined();
  });

  it("passes non-begin results through unchanged", () => {
    const { result } = processThought(
      {
        tag: "open",
        content: "c",
        stepNumber: 2,
        totalSteps: 3,
        nextStepNeeded: true,
        previousJourney: "begin → open",
      },
      [],
    );
    expect(structuredContentFor(result)).toBe(result);
  });
});

describe("step-1 reconstruction guard", () => {
  it("does NOT reconstruct+append when stepNumber===1 with a non-begin tag", () => {
    const { result, thoughtProcess } = processThought(
      {
        tag: "open",
        content: "c",
        stepNumber: 1,
        totalSteps: 3,
        nextStepNeeded: true,
        previousJourney: "begin → examine → reflect",
      },
      [],
    );
    expect(thoughtProcess.length).toBe(1);
    expect(result.journey).toBe("open");
  });

  it("DOES reconstruct on step>1 (normal stateless flow)", () => {
    const { result, thoughtProcess } = processThought(
      {
        tag: "examine",
        content: "c",
        stepNumber: 3,
        totalSteps: 4,
        nextStepNeeded: true,
        previousJourney: "begin → open",
      },
      [],
    );
    expect(thoughtProcess.map((s) => s.tag)).toEqual([
      "begin",
      "open",
      "examine",
    ]);
    expect(result.journey).toBe("begin → open → examine");
  });
});

describe("content is required at the schema boundary", () => {
  const schema = z.object(lotusInputShape);
  const base = {
    tag: "examine",
    stepNumber: 2,
    totalSteps: 3,
    nextStepNeeded: true,
  };

  it("rejects a call missing content", () => {
    expect(schema.safeParse(base).success).toBe(false);
  });
  it("rejects empty content", () => {
    expect(schema.safeParse({ ...base, content: "" }).success).toBe(false);
  });
  it("accepts non-empty content", () => {
    expect(schema.safeParse({ ...base, content: "x" }).success).toBe(true);
  });
});
