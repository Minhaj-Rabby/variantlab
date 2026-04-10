import { describe, expect, it } from "vitest";
import { matchUserId } from "../../operators/user-id.js";
import type { EvalContext } from "../../types.js";

function ctx(overrides: Partial<EvalContext> = {}): EvalContext {
  return { ...overrides };
}

describe("matchUserId — explicit list", () => {
  it("matches when the userId is in the list", () => {
    expect(matchUserId(["alice", "bob"], ctx({ userId: "alice" }))).toBe(true);
    expect(matchUserId(["alice", "bob"], ctx({ userId: "bob" }))).toBe(true);
  });

  it("does not match when the userId is absent", () => {
    expect(matchUserId(["alice", "bob"], ctx({ userId: "carol" }))).toBe(false);
  });

  it("fails when the context userId is undefined", () => {
    expect(matchUserId(["alice"], ctx())).toBe(false);
  });

  it("fails for an empty list", () => {
    expect(matchUserId([], ctx({ userId: "alice" }))).toBe(false);
  });
});

describe("matchUserId — hash bucket", () => {
  it("matches when the precomputed bucket is strictly less than mod", () => {
    expect(matchUserId({ hash: "sha256", mod: 50 }, ctx({ userIdBucket: 0 }))).toBe(true);
    expect(matchUserId({ hash: "sha256", mod: 50 }, ctx({ userIdBucket: 49 }))).toBe(true);
  });

  it("does not match at the boundary (bucket === mod)", () => {
    expect(matchUserId({ hash: "sha256", mod: 50 }, ctx({ userIdBucket: 50 }))).toBe(false);
  });

  it("does not match when the bucket exceeds mod", () => {
    expect(matchUserId({ hash: "sha256", mod: 10 }, ctx({ userIdBucket: 99 }))).toBe(false);
  });

  it("fails when the bucket is missing (fail-closed)", () => {
    expect(matchUserId({ hash: "sha256", mod: 10 }, ctx({ userId: "alice" }))).toBe(false);
  });

  it("handles mod=0 (never matches)", () => {
    expect(matchUserId({ hash: "sha256", mod: 0 }, ctx({ userIdBucket: 0 }))).toBe(false);
  });

  it("handles mod=100 (always matches when bucket present)", () => {
    expect(matchUserId({ hash: "sha256", mod: 100 }, ctx({ userIdBucket: 99 }))).toBe(true);
    expect(matchUserId({ hash: "sha256", mod: 100 }, ctx({ userIdBucket: 0 }))).toBe(true);
  });
});
