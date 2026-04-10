import { describe, expect, it } from "vitest";
import { matchScreenSize } from "../../operators/screen-size.js";

describe("matchScreenSize", () => {
  it("matches when the bucket is in the list", () => {
    expect(matchScreenSize(["small", "medium"], "small")).toBe(true);
    expect(matchScreenSize(["small", "medium"], "medium")).toBe(true);
  });

  it("does not match when the bucket is absent", () => {
    expect(matchScreenSize(["small"], "large")).toBe(false);
  });

  it("fails when the context size is undefined", () => {
    expect(matchScreenSize(["small"], undefined)).toBe(false);
  });

  it("fails for an empty target list", () => {
    expect(matchScreenSize([], "small")).toBe(false);
  });
});
