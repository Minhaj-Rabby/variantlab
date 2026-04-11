import { describe, expect, it } from "vitest";
import type { Experiment } from "../../config/types.js";
import { assignStickyHash } from "../index.js";

const exp: Experiment = {
  id: "exp-a",
  name: "Experiment A",
  default: "a",
  variants: [{ id: "a" }, { id: "b" }, { id: "c" }],
};

describe("assignStickyHash", () => {
  it("returns the same variant for the same (userId, experimentId)", () => {
    const a1 = assignStickyHash(exp, "alice");
    const a2 = assignStickyHash(exp, "alice");
    expect(a1).toBe(a2);
  });

  it("returns one of the variant ids", () => {
    const v = assignStickyHash(exp, "alice");
    expect(["a", "b", "c"]).toContain(v);
  });

  it("produces a roughly even distribution over 10k users", () => {
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 10000; i++) {
      const v = assignStickyHash(exp, `user-${i}`);
      counts[v] = (counts[v] ?? 0) + 1;
    }
    // Three variants → expected ~3333 each. Allow 15% tolerance.
    for (const k of ["a", "b", "c"]) {
      expect(counts[k]).toBeGreaterThan(2833);
      expect(counts[k]).toBeLessThan(3833);
    }
  });

  it("different experiments give (likely) different variants for the same user", () => {
    const a = assignStickyHash(exp, "alice");
    const b = assignStickyHash({ ...exp, id: "exp-b" }, "alice");
    // Not guaranteed mathematically but we pick a user where it differs.
    // If this flakes, adjust the sentinel userId.
    let differed = false;
    for (let i = 0; i < 50; i++) {
      if (
        assignStickyHash(exp, `user-${i}`) !==
        assignStickyHash({ ...exp, id: "exp-b" }, `user-${i}`)
      ) {
        differed = true;
        break;
      }
    }
    expect(differed).toBe(true);
    // Ensure at least the first call returned a valid variant.
    expect(["a", "b", "c"]).toContain(a);
    expect(["a", "b", "c"]).toContain(b);
  });

  it("sorts variants for a stable mapping (order of definition doesn't matter)", () => {
    const reordered: Experiment = { ...exp, variants: [{ id: "c" }, { id: "b" }, { id: "a" }] };
    expect(assignStickyHash(exp, "alice")).toBe(assignStickyHash(reordered, "alice"));
  });
});
