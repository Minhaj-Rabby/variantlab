/**
 * Tests for the top-level `assignVariant` dispatcher.
 */
import { describe, expect, it } from "vitest";
import type { Experiment } from "../../config/types.js";
import { assignStickyHash, assignVariant, assignWeighted } from "../index.js";

const base: Experiment = {
  id: "exp-a",
  name: "Experiment A",
  default: "control",
  variants: [{ id: "control" }, { id: "treatment" }],
};

describe("assignVariant", () => {
  it('returns default when strategy is "default"', () => {
    expect(assignVariant({ ...base, assignment: "default" }, "alice")).toBe("control");
  });

  it("returns default when userId is undefined", () => {
    expect(assignVariant({ ...base, assignment: "sticky-hash" }, undefined)).toBe("control");
  });

  it("returns default when userId is an empty string", () => {
    expect(assignVariant({ ...base, assignment: "sticky-hash" }, "")).toBe("control");
  });

  it("delegates to sticky-hash for that strategy", () => {
    const exp: Experiment = { ...base, assignment: "sticky-hash" };
    expect(assignVariant(exp, "alice")).toBe(assignStickyHash(exp, "alice"));
  });

  it("delegates to weighted for that strategy", () => {
    const exp: Experiment = {
      ...base,
      assignment: "weighted",
      split: { control: 50, treatment: 50 },
    };
    expect(assignVariant(exp, "alice")).toBe(assignWeighted(exp, "alice"));
  });

  it("delegates to random for that strategy (behaviorally = sticky-hash in phase 1)", () => {
    const exp: Experiment = { ...base, assignment: "random" };
    expect(assignVariant(exp, "alice")).toBe(assignStickyHash(exp, "alice"));
  });

  it("defaults to default strategy when assignment is unspecified", () => {
    expect(assignVariant(base, "alice")).toBe("control");
  });
});
