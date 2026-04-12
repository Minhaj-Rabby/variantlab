/**
 * Tests for the pure helpers in the overlay package (filter, source
 * description, context stringifier, history summarizer, theme merge).
 *
 * These are exercised in isolation — the UI snapshot test lives in
 * `overlay.test.tsx`.
 */

import type { EngineEvent, Experiment } from "@variantlab/core";
import { describe, expect, it } from "vitest";
import { describeAssignmentSource } from "../overlay/experiment-card.js";
import { filterExperiments, isVisibleExperiment, matchesSearch } from "../overlay/filter.js";

import { stringifyContext } from "../overlay/tabs/context.js";
import { summarize } from "../overlay/tabs/history.js";
import { DEFAULT_THEME, mergeTheme } from "../overlay/theme.js";

const experiment: Experiment = {
  id: "hero-card",
  name: "Hero card layout",
  default: "variant-a",
  variants: [
    { id: "variant-a", label: "Stacked" },
    { id: "variant-b", label: "Grid" },
  ],
};

const archived: Experiment = {
  id: "old-banner",
  name: "Old promo banner",
  status: "archived",
  default: "off",
  variants: [{ id: "off" }, { id: "on" }],
};

describe("overlay/filter", () => {
  it("hides archived experiments", () => {
    expect(isVisibleExperiment(experiment)).toBe(true);
    expect(isVisibleExperiment(archived)).toBe(false);
  });

  it("matches on id, name, or variant id/label case-insensitively", () => {
    expect(matchesSearch(experiment, "")).toBe(true);
    expect(matchesSearch(experiment, "HERO")).toBe(true);
    expect(matchesSearch(experiment, "card")).toBe(true);
    expect(matchesSearch(experiment, "grid")).toBe(true);
    expect(matchesSearch(experiment, "variant-b")).toBe(true);
    expect(matchesSearch(experiment, "nope")).toBe(false);
  });

  it("filters archived and non-matching entries", () => {
    const result = filterExperiments([experiment, archived], "hero");
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("hero-card");
  });
});

describe("describeAssignmentSource", () => {
  it("prefers override over targeting", () => {
    expect(describeAssignmentSource(true, true)).toBe("manual override");
    expect(describeAssignmentSource(true, false)).toBe("manual override");
  });

  it("reports targeting when targeted without override", () => {
    expect(describeAssignmentSource(false, true)).toBe("by targeting");
  });

  it("falls through to default", () => {
    expect(describeAssignmentSource(false, false)).toBe("by default");
  });
});

describe("stringifyContext", () => {
  it("emits pretty JSON and masks userId", () => {
    const s = stringifyContext({ userId: "user-1234567890", platform: "ios" });
    expect(s).toContain('"platform": "ios"');
    // Masked form: first 2 chars + … + last 2 chars.
    expect(s).toContain('"userId": "us…90"');
  });

  it("emits three-star mask for very short userIds", () => {
    const s = stringifyContext({ userId: "abc" });
    expect(s).toContain('"userId": "***"');
  });

  it("passes through empty context", () => {
    expect(stringifyContext({})).toBe("{}");
  });
});

describe("summarize", () => {
  it("handles every EngineEvent type", () => {
    const cfg = { version: 1 as const, experiments: [experiment] };
    const events: EngineEvent[] = [
      { type: "ready", config: cfg },
      { type: "assignment", experimentId: "a", variantId: "b", context: {} },
      { type: "exposure", experimentId: "a", variantId: "b", context: {} },
      { type: "variantChanged", experimentId: "a", variantId: "b", source: "user" },
      { type: "rollback", experimentId: "a", variantId: "b", reason: "threshold" },
      { type: "configLoaded", config: cfg },
      { type: "contextUpdated", context: {} },
      { type: "error", error: new Error("boom") },
    ];
    for (const e of events) {
      expect(typeof summarize(e)).toBe("string");
    }
    expect(summarize(events[0]!)).toContain("1 experiments");
    expect(summarize(events[3]!)).toContain("→");
    expect(summarize(events[7]!)).toContain("boom");
  });
});

describe("mergeTheme", () => {
  it("returns the base when no patch is provided", () => {
    expect(mergeTheme(DEFAULT_THEME, undefined)).toEqual(DEFAULT_THEME);
  });

  it("merges partial overrides", () => {
    const merged = mergeTheme(DEFAULT_THEME, { accent: "#ff0000" });
    expect(merged.accent).toBe("#ff0000");
    expect(merged.background).toBe(DEFAULT_THEME.background);
  });
});

