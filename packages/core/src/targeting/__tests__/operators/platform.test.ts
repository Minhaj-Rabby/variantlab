import { describe, expect, it } from "vitest";
import { matchPlatform } from "../../operators/platform.js";

describe("matchPlatform", () => {
  it("matches when the context platform is in the target list", () => {
    expect(matchPlatform(["ios", "android"], "ios")).toBe(true);
    expect(matchPlatform(["ios", "android"], "android")).toBe(true);
  });

  it("does not match when the platform is absent from the list", () => {
    expect(matchPlatform(["ios"], "android")).toBe(false);
    expect(matchPlatform(["web"], "node")).toBe(false);
  });

  it("fails when the context platform is undefined", () => {
    expect(matchPlatform(["ios"], undefined)).toBe(false);
  });

  it("fails for an empty target list", () => {
    expect(matchPlatform([], "ios")).toBe(false);
  });
});
