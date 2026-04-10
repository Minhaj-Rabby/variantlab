import { describe, expect, it } from "vitest";
import { matchAppVersion } from "../../operators/app-version.js";

describe("matchAppVersion", () => {
  it("matches when the semver range is satisfied", () => {
    expect(matchAppVersion(">=1.0.0", "1.5.0")).toBe(true);
    expect(matchAppVersion("^1.2.0", "1.9.9")).toBe(true);
    expect(matchAppVersion("1.0.0 - 2.0.0", "1.5.0")).toBe(true);
  });

  it("does not match when the version falls outside the range", () => {
    expect(matchAppVersion(">=2.0.0", "1.9.9")).toBe(false);
    expect(matchAppVersion("^1.0.0", "2.0.0")).toBe(false);
  });

  it("fails when the context version is undefined", () => {
    expect(matchAppVersion(">=1.0.0", undefined)).toBe(false);
  });

  it("fails when the context version is unparseable (fail-closed)", () => {
    expect(matchAppVersion(">=1.0.0", "garbage")).toBe(false);
    expect(matchAppVersion(">=1.0.0", "1.2.3-beta")).toBe(false);
  });

  it("fails when the range is unparseable", () => {
    expect(matchAppVersion("not-a-range", "1.0.0")).toBe(false);
  });
});
