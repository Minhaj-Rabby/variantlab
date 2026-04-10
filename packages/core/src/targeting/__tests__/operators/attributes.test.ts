import { describe, expect, it } from "vitest";
import { matchAttributes } from "../../operators/attributes.js";

describe("matchAttributes", () => {
  it("matches on a single key/value", () => {
    expect(matchAttributes({ plan: "premium" }, { plan: "premium" })).toBe(true);
  });

  it("ANDs across multiple keys", () => {
    expect(
      matchAttributes(
        { plan: "premium", region: "us-west" },
        { plan: "premium", region: "us-west" },
      ),
    ).toBe(true);
    expect(
      matchAttributes({ plan: "premium", region: "us-west" }, { plan: "premium", region: "eu" }),
    ).toBe(false);
  });

  it("does not match when a key is missing from the context", () => {
    expect(matchAttributes({ plan: "premium" }, { region: "us-west" })).toBe(false);
  });

  it("does not match on wrong value type (strict equality)", () => {
    // 1 !== "1"
    expect(matchAttributes({ age: 1 }, { age: "1" })).toBe(false);
    // true !== "true"
    expect(matchAttributes({ active: true }, { active: "true" })).toBe(false);
  });

  it("matches primitive booleans and numbers exactly", () => {
    expect(matchAttributes({ betaOptIn: true }, { betaOptIn: true })).toBe(true);
    expect(matchAttributes({ age: 42 }, { age: 42 })).toBe(true);
  });

  it("passes trivially for an empty target object", () => {
    expect(matchAttributes({}, { plan: "premium" })).toBe(true);
    expect(matchAttributes({}, undefined)).toBe(true);
  });

  it("fails when context.attributes is undefined but targets exist", () => {
    expect(matchAttributes({ plan: "premium" }, undefined)).toBe(false);
  });
});
