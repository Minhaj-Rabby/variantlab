import { describe, expect, it } from "vitest";
import type { Experiment } from "../../config/types.js";
import { assignRandom, assignStickyHash } from "../index.js";

const exp: Experiment = {
  id: "exp-a",
  name: "Experiment A",
  default: "a",
  variants: [{ id: "a" }, { id: "b" }],
};

describe("assignRandom", () => {
  it("is deterministic per (userId, experimentId)", () => {
    expect(assignRandom(exp, "alice")).toBe(assignRandom(exp, "alice"));
  });

  it("delegates to sticky-hash in phase 1", () => {
    for (let i = 0; i < 50; i++) {
      const id = `user-${i}`;
      expect(assignRandom(exp, id)).toBe(assignStickyHash(exp, id));
    }
  });

  it("returns a valid variant id", () => {
    expect(["a", "b"]).toContain(assignRandom(exp, "alice"));
  });
});
