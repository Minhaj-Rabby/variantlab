import { describe, expect, it } from "vitest";
import type { Experiment, ExperimentsConfig } from "../../config/types.js";
import { isKilled } from "../kill-switch.js";

const exp: Experiment = {
  id: "exp-a",
  name: "Experiment A",
  default: "a",
  variants: [{ id: "a" }, { id: "b" }],
};

const cfgOn: ExperimentsConfig = { version: 1, enabled: true, experiments: [exp] };
const cfgOff: ExperimentsConfig = { version: 1, enabled: false, experiments: [exp] };
const cfgDefault: ExperimentsConfig = { version: 1, experiments: [exp] };

describe("isKilled", () => {
  it("is false when enabled=true and status is active", () => {
    expect(isKilled(cfgOn, { ...exp, status: "active" })).toBe(false);
  });

  it("is false when enabled is unspecified (defaults to on)", () => {
    expect(isKilled(cfgDefault, exp)).toBe(false);
  });

  it("is true when the global kill switch is off", () => {
    expect(isKilled(cfgOff, exp)).toBe(true);
  });

  it('is true when experiment status is "archived"', () => {
    expect(isKilled(cfgOn, { ...exp, status: "archived" })).toBe(true);
  });

  it('is true when experiment status is "draft"', () => {
    expect(isKilled(cfgOn, { ...exp, status: "draft" })).toBe(true);
  });
});
