import { describe, expect, it } from "vitest";
import { resolveMutex } from "../index.js";

describe("resolveMutex", () => {
  it("returns undefined for an empty candidate list", () => {
    expect(resolveMutex("alice", "group-a", [])).toBeUndefined();
  });

  it("returns the only candidate when there's exactly one", () => {
    expect(resolveMutex("alice", "group-a", ["exp-1"])).toBe("exp-1");
  });

  it("is deterministic for the same (user, group, candidates)", () => {
    const a = resolveMutex("alice", "g", ["exp-1", "exp-2", "exp-3"]);
    const b = resolveMutex("alice", "g", ["exp-1", "exp-2", "exp-3"]);
    expect(a).toBe(b);
  });

  it("candidate order doesn't change the winner (sort inside)", () => {
    const a = resolveMutex("alice", "g", ["exp-1", "exp-2", "exp-3"]);
    const b = resolveMutex("alice", "g", ["exp-3", "exp-2", "exp-1"]);
    expect(a).toBe(b);
  });

  it("distributes winners across users", () => {
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 3000; i++) {
      const winner = resolveMutex(`user-${i}`, "group-1", ["a", "b", "c"]);
      expect(winner).toBeDefined();
      counts[winner!] = (counts[winner!] ?? 0) + 1;
    }
    // Each ~1000 ± 20%
    expect(counts.a).toBeGreaterThan(800);
    expect(counts.b).toBeGreaterThan(800);
    expect(counts.c).toBeGreaterThan(800);
  });

  it("different groups give (likely) different winners for the same user", () => {
    let differed = false;
    for (let i = 0; i < 50; i++) {
      const u = `user-${i}`;
      if (
        resolveMutex(u, "group-1", ["a", "b", "c"]) !== resolveMutex(u, "group-2", ["a", "b", "c"])
      ) {
        differed = true;
        break;
      }
    }
    expect(differed).toBe(true);
  });
});
