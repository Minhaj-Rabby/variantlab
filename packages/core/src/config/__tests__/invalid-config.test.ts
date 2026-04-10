import { describe, expect, it } from "vitest";
import type { ConfigIssue, IssueCode } from "../index.js";
import { ConfigValidationError, validateConfig } from "../index.js";

function expectIssue(input: unknown, code: IssueCode): readonly ConfigIssue[] {
  try {
    validateConfig(input);
  } catch (err) {
    expect(err).toBeInstanceOf(ConfigValidationError);
    const e = err as ConfigValidationError;
    expect(e.issues.some((i) => i.code === code)).toBe(true);
    return e.issues;
  }
  throw new Error("expected validateConfig to throw");
}

describe("validateConfig — invalid inputs", () => {
  it("throws a ConfigValidationError (not a plain Error)", () => {
    try {
      validateConfig({});
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigValidationError);
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).name).toBe("ConfigValidationError");
      return;
    }
    throw new Error("expected throw");
  });

  it("rejects invalid JSON strings", () => {
    expectIssue("{not json", "invalid-json");
  });

  it("rejects non-object root", () => {
    expectIssue(null, "not-an-object");
    expectIssue(42, "not-an-object");
    expectIssue([], "not-an-object");
  });

  it("rejects missing version", () => {
    expectIssue({ experiments: [] }, "version/missing");
  });

  it("rejects wrong version", () => {
    expectIssue({ version: 2, experiments: [] }, "version/invalid");
  });

  it("rejects non-boolean enabled", () => {
    expectIssue({ version: 1, enabled: "yes", experiments: [] }, "enabled/invalid");
  });

  it("rejects empty signature string", () => {
    expectIssue({ version: 1, signature: "", experiments: [] }, "signature/invalid");
  });

  it("rejects missing experiments", () => {
    expectIssue({ version: 1 }, "experiments/missing");
  });

  it("rejects non-array experiments", () => {
    expectIssue({ version: 1, experiments: {} }, "experiments/not-an-array");
  });

  it("rejects > 1000 experiments", () => {
    const many = [];
    for (let i = 0; i < 1001; i++) {
      many.push({
        id: `e${i}`,
        name: "X",
        default: "a",
        variants: [{ id: "a" }, { id: "b" }],
      });
    }
    expectIssue({ version: 1, experiments: many }, "experiments/too-many");
  });

  it("rejects experiment that is not an object", () => {
    expectIssue({ version: 1, experiments: [null] }, "experiment/not-an-object");
    expectIssue({ version: 1, experiments: [42] }, "experiment/not-an-object");
    expectIssue({ version: 1, experiments: [[]] }, "experiment/not-an-object");
  });

  it("rejects missing required experiment fields", () => {
    expectIssue({ version: 1, experiments: [{}] }, "experiment/missing-required");
  });

  it("rejects invalid experiment id regex", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "Invalid_ID",
            name: "X",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "experiment/id/invalid",
    );
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "-leading-dash",
            name: "X",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "experiment/id/invalid",
    );
  });

  it("rejects duplicate experiment ids", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          { id: "x", name: "X", default: "a", variants: [{ id: "a" }, { id: "b" }] },
          { id: "x", name: "Y", default: "a", variants: [{ id: "a" }, { id: "b" }] },
        ],
      },
      "experiment/id/duplicate",
    );
  });

  it("rejects empty or too-long name", () => {
    expectIssue(
      {
        version: 1,
        experiments: [{ id: "x", name: "", default: "a", variants: [{ id: "a" }, { id: "b" }] }],
      },
      "experiment/name/invalid",
    );
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "A".repeat(129),
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "experiment/name/invalid",
    );
  });

  it("rejects invalid type", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            type: "nope",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "experiment/type/invalid",
    );
  });

  it("rejects invalid status", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            status: "not-a-status",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "experiment/status/invalid",
    );
  });

  it("rejects missing variants", () => {
    expectIssue(
      { version: 1, experiments: [{ id: "x", name: "X", default: "a" }] },
      "experiment/variants/missing",
    );
  });

  it("rejects < 2 variants", () => {
    expectIssue(
      {
        version: 1,
        experiments: [{ id: "x", name: "X", default: "a", variants: [{ id: "a" }] }],
      },
      "experiment/variants/too-few",
    );
  });

  it("rejects > 100 variants", () => {
    const variants = [];
    for (let i = 0; i < 101; i++) variants.push({ id: `v${i}` });
    expectIssue(
      { version: 1, experiments: [{ id: "x", name: "X", default: "v0", variants }] },
      "experiment/variants/too-many",
    );
  });

  it("rejects duplicate variant ids", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            variants: [{ id: "a" }, { id: "a" }],
          },
        ],
      },
      "variant/id/duplicate",
    );
  });

  it("rejects invalid variant id regex", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            variants: [{ id: "A" }, { id: "b" }],
          },
        ],
      },
      "variant/id/invalid",
    );
  });

  it("rejects non-object variant", () => {
    expectIssue(
      {
        version: 1,
        experiments: [{ id: "x", name: "X", default: "a", variants: [null, { id: "b" }] }],
      },
      "variant/not-an-object",
    );
  });

  it("rejects missing default", () => {
    expectIssue(
      {
        version: 1,
        experiments: [{ id: "x", name: "X", variants: [{ id: "a" }, { id: "b" }] }],
      },
      "experiment/default/missing",
    );
  });

  it("rejects default pointing to an unknown variant", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "nope",
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "experiment/default/unknown-variant",
    );
  });

  it("rejects invalid assignment strategy", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            assignment: "bogus",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "experiment/assignment/invalid",
    );
  });

  it("rejects weighted assignment without split", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            assignment: "weighted",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "split/missing",
    );
  });

  it("rejects split with unknown variant", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            assignment: "weighted",
            split: { a: 50, ghost: 50 },
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "split/unknown-variant",
    );
  });

  it("rejects split with non-integer values", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            assignment: "weighted",
            split: { a: 50.5, b: 49.5 },
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "split/value-invalid",
    );
  });

  it("rejects split sum ≠ 100", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            assignment: "weighted",
            split: { a: 70, b: 20 },
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "split/sum-invalid",
    );
  });

  it("rejects bad route glob", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            routes: ["no leading slash"],
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "route/glob/invalid",
    );
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            routes: ["/foo/***"],
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "route/glob/invalid",
    );
  });

  it("rejects routes that is not an array", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            routes: "/foo",
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "experiment/routes/invalid",
    );
  });

  it("rejects non-object targeting", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            targeting: [],
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "targeting/not-an-object",
    );
  });

  it("rejects targeting nested deeper than 10 levels", () => {
    let nested: unknown = "deep";
    for (let i = 0; i < 12; i++) nested = { next: nested };
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            targeting: { attributes: { deep: nested } },
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "targeting/depth-exceeded",
    );
  });

  it("rejects invalid targeting.platform values", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            targeting: { platform: ["windows"] },
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "targeting/platform/invalid",
    );
  });

  it("rejects invalid semver range", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            targeting: { appVersion: "not-a-version" },
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "targeting/appversion/invalid",
    );
  });

  it("rejects empty targeting.locale", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            targeting: { locale: [] },
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "targeting/locale/invalid",
    );
  });

  it("rejects invalid targeting.screenSize value", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            targeting: { screenSize: ["huge"] },
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "targeting/screensize/invalid",
    );
  });

  it("rejects targeting.userId with empty list", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            targeting: { userId: [] },
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "targeting/userid/invalid",
    );
  });

  it("rejects targeting.userId hash bucket with invalid mod", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            targeting: { userId: { hash: "sha256", mod: 500 } },
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "targeting/userid/invalid",
    );
  });

  it("rejects non-object targeting.attributes", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            targeting: { attributes: "nope" },
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "targeting/attributes/invalid",
    );
  });

  it("rejects invalid ISO date", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            startDate: "2026-01-01",
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "experiment/startdate/invalid",
    );
  });

  it("rejects endDate before startDate", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            startDate: "2026-11-01T00:00:00Z",
            endDate: "2026-10-01T00:00:00Z",
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "experiment/date-range/invalid",
    );
  });

  it("rejects invalid rollback threshold", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            rollback: { threshold: 0, window: 60000 },
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "rollback/threshold/invalid",
    );
  });

  it("rejects invalid rollback window", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            rollback: { threshold: 3, window: 100 },
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "rollback/window/invalid",
    );
  });

  it("rejects rollback with non-boolean persistent", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            rollback: { threshold: 3, window: 60000, persistent: "yes" },
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "rollback/persistent/invalid",
    );
  });

  it("rejects non-object rollback", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            rollback: "not an object",
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "rollback/not-an-object",
    );
  });

  it("rejects invalid mutex/owner/overridable", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            mutex: "",
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "experiment/mutex/invalid",
    );
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            overridable: "yes",
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "experiment/overridable/invalid",
    );
  });

  it("accumulates multiple issues in a single throw (fail-slow)", () => {
    try {
      validateConfig({
        version: 2, // issue 1
        enabled: "yes", // issue 2
        experiments: [
          {
            id: "Invalid", // issue 3
            name: "", // issue 4
            default: "ghost", // issue 5 (unknown variant)
            variants: [{ id: "a" }, { id: "a" }], // issue 6 (duplicate)
          },
        ],
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigValidationError);
      const e = err as ConfigValidationError;
      expect(e.issues.length).toBeGreaterThanOrEqual(5);
      const codes = new Set(e.issues.map((i) => i.code));
      expect(codes.has("version/invalid")).toBe(true);
      expect(codes.has("enabled/invalid")).toBe(true);
      expect(codes.has("experiment/id/invalid")).toBe(true);
      expect(codes.has("experiment/name/invalid")).toBe(true);
      expect(codes.has("variant/id/duplicate")).toBe(true);
      return;
    }
    throw new Error("expected throw");
  });

  it("ConfigValidationError.issues is frozen", () => {
    try {
      validateConfig({});
    } catch (err) {
      const e = err as ConfigValidationError;
      expect(Object.isFrozen(e.issues)).toBe(true);
      expect(() => {
        (e.issues as ConfigIssue[]).push({
          path: "",
          code: "invalid-json",
          message: "x",
        });
      }).toThrow();
      return;
    }
    throw new Error("expected throw");
  });
});

/**
 * Tests targeting less-common branches in the validator. These shore up
 * coverage for rules that existing tests happened not to hit.
 */
describe("validateConfig — edge-case branches", () => {
  it("handles a cyclic object input (measureBytes catches JSON.stringify throw)", () => {
    // JSON.stringify on a cyclic object throws TypeError. measureBytes
    // must catch and return 0, allowing validation to proceed to the
    // structural checks that will report other issues.
    const cyclic: Record<string, unknown> = {
      version: 1,
      experiments: [],
    };
    cyclic["self"] = cyclic;
    // We only care that this doesn't blow up with an uncaught TypeError.
    expect(() => validateConfig(cyclic)).not.toThrow(TypeError);
  });

  it("rejects variants that is not an array (string)", () => {
    expectIssue(
      {
        version: 1,
        experiments: [{ id: "x", name: "X", default: "a", variants: "not-an-array" }],
      },
      "experiment/variants/missing",
    );
  });

  it("rejects a variant missing its id", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            variants: [{ id: "a" }, { label: "no-id" }],
          },
        ],
      },
      "experiment/missing-required",
    );
  });

  it("rejects default that is not a string (number)", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: 42,
            variants: [{ id: "a" }, { id: "b" }],
          },
        ],
      },
      "experiment/default/unknown-variant",
    );
  });

  it("rejects split that is not an object (array)", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
            assignment: "weighted",
            split: [50, 50],
          },
        ],
      },
      "split/not-an-object",
    );
  });

  it("rejects split that is null", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
            assignment: "weighted",
            split: null,
          },
        ],
      },
      "split/not-an-object",
    );
  });

  it("rejects more than MAX_ROUTES (1000) routes", () => {
    const routes = new Array(1001).fill(0).map((_, i) => `/r${i}`);
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
            routes,
          },
        ],
      },
      "experiment/routes/invalid",
    );
  });

  it("rejects targeting.platform that is not an array (string)", () => {
    // Hits the !Array.isArray(v) branch in checkEnumArray.
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
            targeting: { platform: "ios" },
          },
        ],
      },
      "targeting/platform/invalid",
    );
  });

  it("rejects targeting.locale with a non-string element", () => {
    // Hits the for-loop body in checkStringArray.
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
            targeting: { locale: ["en-US", 42, ""] },
          },
        ],
      },
      "targeting/locale/invalid",
    );
  });

  it("rejects targeting.locale that is not an array (string)", () => {
    // Hits the !Array.isArray branch in checkStringArray.
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
            targeting: { locale: "en-US" },
          },
        ],
      },
      "targeting/locale/invalid",
    );
  });

  it("rejects targeting.routes that is not an array", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
            targeting: { routes: "/single" },
          },
        ],
      },
      "targeting/routes/invalid",
    );
  });

  it("rejects targeting.routes as an empty array", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
            targeting: { routes: [] },
          },
        ],
      },
      "targeting/routes/invalid",
    );
  });

  it("rejects targeting.routes containing an invalid glob", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
            targeting: { routes: ["/***/bad"] },
          },
        ],
      },
      "targeting/routes/invalid",
    );
  });

  it("rejects targeting.userId array with a non-string element", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
            targeting: { userId: ["alice", 42] },
          },
        ],
      },
      "targeting/userid/invalid",
    );
  });

  it("rejects targeting.userId hash bucket missing hash field", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
            targeting: { userId: { mod: 10 } },
          },
        ],
      },
      "targeting/userid/invalid",
    );
  });

  it("rejects targeting.userId that is a primitive (neither array nor object)", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
            targeting: { userId: "alice" },
          },
        ],
      },
      "targeting/userid/invalid",
    );
  });

  it("rejects an invalid endDate", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
            endDate: "not-a-date",
          },
        ],
      },
      "experiment/enddate/invalid",
    );
  });

  it("rejects a rollback missing threshold", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
            rollback: { window: 60000 },
          },
        ],
      },
      "rollback/threshold/invalid",
    );
  });

  it("rejects a rollback missing window", () => {
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
            rollback: { threshold: 5 },
          },
        ],
      },
      "rollback/window/invalid",
    );
  });

  it("rejects a hyphenated semver range with an invalid core version", () => {
    // Hits SEMVER_CORE.test(...) false branch inside isValidSemver.
    expectIssue(
      {
        version: 1,
        experiments: [
          {
            id: "x",
            name: "X",
            default: "a",
            variants: [{ id: "a" }, { id: "b" }],
            targeting: { appVersion: "not-a-version - 2.0.0" },
          },
        ],
      },
      "targeting/appversion/invalid",
    );
  });
});
