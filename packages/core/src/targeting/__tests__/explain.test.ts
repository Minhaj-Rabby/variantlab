import { describe, expect, it } from "vitest";
import type { Experiment } from "../../config/types.js";
import { explain } from "../index.js";
import type { EvaluableTargeting } from "../types.js";

function exp(overrides: Partial<Experiment>): Experiment {
  return {
    id: "x",
    name: "X",
    default: "a",
    variants: [{ id: "a" }, { id: "b" }],
    ...overrides,
  };
}

describe("explain — no targeting", () => {
  it("matches with empty steps when there is no targeting, no dates", () => {
    const r = explain(exp({}), {});
    expect(r).toEqual({ matched: true, steps: [] });
  });
});

describe("explain — targeting traces", () => {
  it("emits a step for every field that was checked when all pass", () => {
    const targeting: EvaluableTargeting = {
      platform: ["ios"],
      locale: ["en"],
    };
    const r = explain(exp({ targeting }), { platform: "ios", locale: "en-US" });
    expect(r.matched).toBe(true);
    expect(r.steps.map((s) => s.field)).toEqual(["platform", "locale"]);
    for (const s of r.steps) expect(s.matched).toBe(true);
  });

  it("short-circuits at the first failing step and reports it", () => {
    const targeting: EvaluableTargeting = {
      platform: ["ios"],
      screenSize: ["small"],
      locale: ["en"],
    };
    const r = explain(exp({ targeting }), { platform: "ios", screenSize: "large", locale: "en" });
    expect(r.matched).toBe(false);
    expect(r.reason).toBe("screenSize");
    expect(r.steps.map((s) => s.field)).toEqual(["platform", "screenSize"]);
    const last = r.steps[r.steps.length - 1];
    expect(last?.matched).toBe(false);
    expect(last?.detail).toBeTruthy();
  });

  it("includes every operator step when they all pass", () => {
    const targeting: EvaluableTargeting = {
      platform: ["ios"],
      screenSize: ["small"],
      locale: ["en"],
      appVersion: ">=1.0.0",
      routes: ["/blog/*"],
      attributes: { plan: "premium" },
      userId: ["alice"],
      predicate: () => true,
    };
    const r = explain(exp({ targeting }), {
      platform: "ios",
      screenSize: "small",
      locale: "en-US",
      appVersion: "1.5.0",
      route: "/blog/post-1",
      attributes: { plan: "premium" },
      userId: "alice",
    });
    expect(r.matched).toBe(true);
    expect(r.steps.map((s) => s.field)).toEqual([
      "platform",
      "screenSize",
      "locale",
      "appVersion",
      "routes",
      "attributes",
      "userId",
      "predicate",
    ]);
  });
});

describe("explain — date gating", () => {
  it("fails with reason `startDate` when the experiment has not started", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const r = explain(exp({ startDate: future }), {});
    expect(r.matched).toBe(false);
    expect(r.reason).toBe("startDate");
    expect(r.steps.length).toBe(1);
    expect(r.steps[0]?.field).toBe("startDate");
    expect(r.steps[0]?.matched).toBe(false);
    expect(r.steps[0]?.detail).toContain(future);
  });

  it("fails with reason `endDate` when the experiment has ended", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const r = explain(exp({ endDate: past }), {});
    expect(r.matched).toBe(false);
    expect(r.reason).toBe("endDate");
    const last = r.steps[r.steps.length - 1];
    expect(last?.field).toBe("endDate");
    expect(last?.detail).toContain(past);
  });

  it("passes date gating and walks targeting afterwards", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();
    const r = explain(
      exp({
        startDate: past,
        endDate: future,
        targeting: { platform: ["ios"] },
      }),
      { platform: "android" },
    );
    expect(r.matched).toBe(false);
    expect(r.reason).toBe("platform");
    expect(r.steps.map((s) => s.field)).toEqual(["startDate", "endDate", "platform"]);
    expect(r.steps[0]?.matched).toBe(true);
    expect(r.steps[1]?.matched).toBe(true);
    expect(r.steps[2]?.matched).toBe(false);
  });

  it("rejects an unparseable startDate", () => {
    const r = explain(exp({ startDate: "garbage" }), {});
    expect(r.matched).toBe(false);
    expect(r.reason).toBe("startDate");
  });

  it("rejects an unparseable endDate", () => {
    const r = explain(exp({ endDate: "garbage" }), {});
    expect(r.matched).toBe(false);
    expect(r.reason).toBe("endDate");
  });
});

describe("explain — detail strings", () => {
  it("includes 'got' and 'required' cues on failure", () => {
    const r = explain(exp({ targeting: { platform: ["android"] } }), { platform: "ios" });
    const last = r.steps[r.steps.length - 1];
    expect(last?.detail).toContain("ios");
    expect(last?.detail).toContain("android");
  });

  it("describes appVersion failures", () => {
    const r = explain(exp({ targeting: { appVersion: ">=2.0.0" } }), { appVersion: "1.0.0" });
    const last = r.steps[r.steps.length - 1];
    expect(last?.detail).toContain("1.0.0");
    expect(last?.detail).toContain(">=2.0.0");
  });

  it("describes routes failures", () => {
    const r = explain(exp({ targeting: { routes: ["/foo"] } }), { route: "/bar" });
    const last = r.steps[r.steps.length - 1];
    expect(last?.detail).toContain("/bar");
    expect(last?.detail).toContain("/foo");
  });

  it("describes attributes failures", () => {
    const r = explain(exp({ targeting: { attributes: { plan: "premium" } } }), {
      attributes: { plan: "free" },
    });
    const last = r.steps[r.steps.length - 1];
    expect(last?.matched).toBe(false);
    expect(last?.detail).toBeTruthy();
  });

  it("describes userId failures", () => {
    const r = explain(exp({ targeting: { userId: ["alice"] } }), { userId: "bob" });
    const last = r.steps[r.steps.length - 1];
    expect(last?.matched).toBe(false);
    expect(last?.detail).toBeTruthy();
  });

  it("describes predicate failures", () => {
    const t: EvaluableTargeting = { predicate: () => false };
    const r = explain(exp({ targeting: t }), {});
    const last = r.steps[r.steps.length - 1];
    expect(last?.field).toBe("predicate");
    expect(last?.matched).toBe(false);
    expect(last?.detail).toBeTruthy();
  });

  it("omits detail on passing steps", () => {
    const r = explain(exp({ targeting: { platform: ["ios"] } }), { platform: "ios" });
    const step = r.steps[0];
    expect(step?.matched).toBe(true);
    expect(step?.detail).toBeUndefined();
  });
});
