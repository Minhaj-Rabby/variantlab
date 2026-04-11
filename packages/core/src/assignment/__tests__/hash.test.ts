import { describe, expect, it } from "vitest";
import { bucketUserId, hash32 } from "../index.js";

describe("hash32", () => {
  it("is deterministic across calls", () => {
    expect(hash32("alice")).toBe(hash32("alice"));
    expect(hash32("")).toBe(hash32(""));
  });

  it("returns a uint32", () => {
    for (const s of ["", "a", "alice", "a:b", "long-string-with-dashes"]) {
      const h = hash32(s);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(2 ** 32);
    }
  });

  it("produces different hashes for similar inputs", () => {
    expect(hash32("alice")).not.toBe(hash32("bob"));
    expect(hash32("a")).not.toBe(hash32("b"));
    expect(hash32("alice:foo")).not.toBe(hash32("alice:bar"));
  });

  it("distributes ~uniformly over 10k ids across 10 buckets (chi-square-ish check)", () => {
    const buckets = new Array<number>(10).fill(0);
    for (let i = 0; i < 10000; i++) {
      const b = hash32(`user-${i}`) % 10;
      buckets[b] = (buckets[b] ?? 0) + 1;
    }
    // Expected 1000 per bucket; allow 20% tolerance.
    for (const count of buckets) {
      expect(count).toBeGreaterThan(800);
      expect(count).toBeLessThan(1200);
    }
  });
});

describe("bucketUserId", () => {
  it("returns an integer in [0, 100)", () => {
    for (let i = 0; i < 200; i++) {
      const b = bucketUserId(`user-${i}`);
      expect(Number.isInteger(b)).toBe(true);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(100);
    }
  });

  it("is stable for a given userId", () => {
    expect(bucketUserId("alice")).toBe(bucketUserId("alice"));
  });
});
