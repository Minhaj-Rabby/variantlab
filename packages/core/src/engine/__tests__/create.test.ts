import { describe, expect, it } from "vitest";
import { ConfigValidationError } from "../../config/index.js";
import { createEngine, VariantEngine } from "../index.js";

function cfg(): unknown {
  return {
    version: 1,
    experiments: [
      {
        id: "exp-a",
        name: "Experiment A",
        default: "a",
        variants: [{ id: "a" }, { id: "b" }],
      },
    ],
  };
}

describe("createEngine", () => {
  it("returns a VariantEngine instance", () => {
    const engine = createEngine(cfg());
    expect(engine).toBeInstanceOf(VariantEngine);
  });

  it("throws ConfigValidationError on invalid input", () => {
    expect(() => createEngine({ version: 2, experiments: [] })).toThrow(ConfigValidationError);
  });

  it("accepts a JSON string config (validator handles string input)", () => {
    const engine = createEngine(JSON.stringify(cfg()));
    expect(engine.getVariant("exp-a")).toBe("a");
  });

  it("accepts engine options", () => {
    const engine = createEngine(cfg(), { context: { userId: "alice" }, failMode: "fail-closed" });
    expect(engine.getVariant("exp-a")).toBe("a");
  });
});
