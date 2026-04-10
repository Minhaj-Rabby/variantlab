import { describe, expect, it } from "vitest";
import { evaluate, matchTargeting } from "../index.js";
import type { EvalContext, EvaluableTargeting } from "../types.js";

describe("evaluate — empty and trivial", () => {
  it("returns matched=true for an empty targeting object", () => {
    expect(evaluate({}, {})).toEqual({ matched: true });
  });

  it("returns matched=true when every specified field passes", () => {
    const t: EvaluableTargeting = {
      platform: ["ios"],
      locale: ["en"],
    };
    const ctx: EvalContext = { platform: "ios", locale: "en-US" };
    expect(evaluate(t, ctx).matched).toBe(true);
  });
});

describe("evaluate — field-by-field", () => {
  it("reports `platform` as the reason when the platform fails", () => {
    expect(evaluate({ platform: ["android"] }, { platform: "ios" })).toEqual({
      matched: false,
      reason: "platform",
    });
  });

  it("reports `screenSize` when screen size fails", () => {
    expect(evaluate({ screenSize: ["small"] }, { screenSize: "large" })).toEqual({
      matched: false,
      reason: "screenSize",
    });
  });

  it("reports `locale` when locale fails", () => {
    expect(evaluate({ locale: ["fr"] }, { locale: "en-US" })).toEqual({
      matched: false,
      reason: "locale",
    });
  });

  it("reports `appVersion` when semver fails", () => {
    expect(evaluate({ appVersion: ">=2.0.0" }, { appVersion: "1.0.0" })).toEqual({
      matched: false,
      reason: "appVersion",
    });
  });

  it("reports `routes` when no pattern matches", () => {
    expect(evaluate({ routes: ["/foo"] }, { route: "/bar" })).toEqual({
      matched: false,
      reason: "routes",
    });
  });

  it("reports `attributes` when a value mismatches", () => {
    expect(evaluate({ attributes: { plan: "premium" } }, { attributes: { plan: "free" } })).toEqual(
      { matched: false, reason: "attributes" },
    );
  });

  it("reports `userId` when the list does not match", () => {
    expect(evaluate({ userId: ["alice"] }, { userId: "bob" })).toEqual({
      matched: false,
      reason: "userId",
    });
  });
});

describe("evaluate — short-circuit and order", () => {
  it("reports the first failing field when multiple would fail", () => {
    // Order is: platform → screenSize → locale → appVersion → routes →
    //           attributes → userId → predicate. If platform AND locale
    // both fail, the reason is 'platform'.
    const result = evaluate(
      { platform: ["android"], locale: ["fr"] },
      { platform: "ios", locale: "en" },
    );
    expect(result).toEqual({ matched: false, reason: "platform" });
  });

  it("walks past passing fields to the next failing one", () => {
    const result = evaluate(
      { platform: ["ios"], locale: ["fr"] },
      { platform: "ios", locale: "en" },
    );
    expect(result).toEqual({ matched: false, reason: "locale" });
  });

  it("unspecified context fields fail when targeting specifies them", () => {
    expect(evaluate({ platform: ["ios"] }, {})).toEqual({
      matched: false,
      reason: "platform",
    });
  });
});

describe("evaluate — predicate", () => {
  it("runs predicate last and uses its return value", () => {
    const truthy: EvaluableTargeting = { predicate: () => true };
    expect(evaluate(truthy, {})).toEqual({ matched: true });

    const falsy: EvaluableTargeting = { predicate: () => false };
    expect(evaluate(falsy, {})).toEqual({ matched: false, reason: "predicate" });
  });

  it("skips predicate if an earlier field fails", () => {
    let called = false;
    const t: EvaluableTargeting = {
      platform: ["android"],
      predicate: () => {
        called = true;
        return true;
      },
    };
    evaluate(t, { platform: "ios" });
    expect(called).toBe(false);
  });

  it("passes the context to the predicate", () => {
    const seen: unknown[] = [];
    const t: EvaluableTargeting = {
      predicate: (ctx) => {
        seen.push(ctx);
        return true;
      },
    };
    const ctx: EvalContext = { userId: "alice" };
    evaluate(t, ctx);
    expect(seen).toEqual([ctx]);
  });
});

describe("evaluate — hash bucket userId", () => {
  it("matches when the precomputed bucket is below mod", () => {
    const t: EvaluableTargeting = { userId: { hash: "sha256", mod: 50 } };
    expect(evaluate(t, { userIdBucket: 10 }).matched).toBe(true);
    expect(evaluate(t, { userIdBucket: 49 }).matched).toBe(true);
  });

  it("does not match at or above the mod boundary", () => {
    const t: EvaluableTargeting = { userId: { hash: "sha256", mod: 50 } };
    expect(evaluate(t, { userIdBucket: 50 }).matched).toBe(false);
    expect(evaluate(t, { userIdBucket: 99 }).matched).toBe(false);
  });

  it("fails closed if the bucket is missing", () => {
    const t: EvaluableTargeting = { userId: { hash: "sha256", mod: 50 } };
    expect(evaluate(t, {})).toEqual({ matched: false, reason: "userId" });
  });
});

describe("matchTargeting — wrapper", () => {
  it("returns the boolean matched field", () => {
    expect(matchTargeting({ platform: ["ios"] }, { platform: "ios" })).toBe(true);
    expect(matchTargeting({ platform: ["ios"] }, { platform: "android" })).toBe(false);
  });
});
