import { describe, expect, it } from "vitest";
import type { Experiment } from "../../config/types.js";
import { assignDefault } from "../index.js";

const exp: Experiment = {
  id: "exp-a",
  name: "Experiment A",
  default: "control",
  variants: [{ id: "control" }, { id: "treatment" }],
};

describe("assignDefault", () => {
  it("returns the configured default variant", () => {
    expect(assignDefault(exp)).toBe("control");
  });
});
