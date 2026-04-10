import { describe, expect, it } from "vitest";
import { matchRoutes } from "../../operators/routes.js";

describe("matchRoutes", () => {
  it("matches if any pattern matches (first-match wins)", () => {
    expect(matchRoutes(["/about", "/blog/*"], "/blog/post-1")).toBe(true);
    expect(matchRoutes(["/about", "/blog/*"], "/about")).toBe(true);
  });

  it("does not match when no pattern matches", () => {
    expect(matchRoutes(["/about", "/blog/*"], "/contact")).toBe(false);
  });

  it("composes with deep wildcards", () => {
    expect(matchRoutes(["/docs/**"], "/docs/a/b/c")).toBe(true);
    expect(matchRoutes(["/docs/**"], "/other")).toBe(false);
  });

  it("fails when the context route is undefined", () => {
    expect(matchRoutes(["/about"], undefined)).toBe(false);
  });

  it("skips invalid patterns (returns false) and continues", () => {
    // First pattern is invalid (no leading slash), second matches.
    expect(matchRoutes(["bad-pattern", "/about"], "/about")).toBe(true);
  });
});
