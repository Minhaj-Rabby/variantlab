import { describe, expect, it } from "vitest";
import { hashUserId } from "../index.js";

describe("hashUserId", () => {
  it("returns an integer in [0, 99]", async () => {
    const b = await hashUserId("alice");
    expect(Number.isInteger(b)).toBe(true);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(100);
  });

  it("is deterministic for the same input", async () => {
    const a = await hashUserId("alice");
    const b = await hashUserId("alice");
    expect(a).toBe(b);
  });

  it("handles the empty string", async () => {
    const b = await hashUserId("");
    expect(Number.isInteger(b)).toBe(true);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(100);
  });

  it("handles UTF-8 input", async () => {
    const b = await hashUserId("日本");
    expect(Number.isInteger(b)).toBe(true);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(100);
  });

  it("produces different buckets for different inputs (sanity spread)", async () => {
    const buckets = new Set<number>();
    for (let i = 0; i < 50; i++) {
      buckets.add(await hashUserId(`user-${i}`));
    }
    // sha256 is a uniform hash; 50 distinct inputs should cover many
    // distinct buckets. Threshold intentionally loose to avoid flakiness.
    expect(buckets.size).toBeGreaterThan(10);
  });

  it("every bucket across a range is an integer in [0, 99]", async () => {
    for (let i = 0; i < 30; i++) {
      const b = await hashUserId(`x-${i}`);
      expect(Number.isInteger(b)).toBe(true);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(100);
    }
  });
});
