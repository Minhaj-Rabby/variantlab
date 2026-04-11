import { describe, expect, it } from "vitest";
import type { Experiment } from "../../config/types.js";
import { assignWeighted } from "../index.js";

const exp: Experiment = {
  id: "checkout",
  name: "Checkout rollout",
  default: "control",
  assignment: "weighted",
  split: { control: 90, treatment: 10 },
  variants: [{ id: "control" }, { id: "treatment" }],
};

describe("assignWeighted", () => {
  it("is deterministic per user", () => {
    expect(assignWeighted(exp, "alice")).toBe(assignWeighted(exp, "alice"));
  });

  it("falls back to default when split is missing", () => {
    const { split: _omit, ...withoutSplit } = exp;
    void _omit;
    expect(assignWeighted(withoutSplit as Experiment, "alice")).toBe("control");
  });

  it("distribution over 10k users is within 2% of the configured split", () => {
    const counts: Record<string, number> = { control: 0, treatment: 0 };
    for (let i = 0; i < 10000; i++) {
      const v = assignWeighted(exp, `user-${i}`);
      counts[v] = (counts[v] ?? 0) + 1;
    }
    // Expected 9000 / 1000. Allow 2% absolute deviation.
    expect(counts.control).toBeGreaterThan(8800);
    expect(counts.control).toBeLessThan(9200);
    expect(counts.treatment).toBeGreaterThan(800);
    expect(counts.treatment).toBeLessThan(1200);
  });

  it("handles a balanced three-way split within 2% tolerance", () => {
    const threeWay: Experiment = {
      id: "three-way",
      name: "Three way",
      default: "a",
      assignment: "weighted",
      split: { a: 34, b: 33, c: 33 },
      variants: [{ id: "a" }, { id: "b" }, { id: "c" }],
    };
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 10000; i++) {
      counts[assignWeighted(threeWay, `user-${i}`)]!++;
    }
    expect(counts.a).toBeGreaterThan(3200);
    expect(counts.a).toBeLessThan(3600);
    expect(counts.b).toBeGreaterThan(3100);
    expect(counts.b).toBeLessThan(3500);
    expect(counts.c).toBeGreaterThan(3100);
    expect(counts.c).toBeLessThan(3500);
  });

  it("falls back to default when split is an empty object", () => {
    const broken: Experiment = { ...exp, split: {} };
    expect(assignWeighted(broken, "alice")).toBe("control");
  });
});
