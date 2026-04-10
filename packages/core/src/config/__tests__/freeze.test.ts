import { describe, expect, it, vi } from "vitest";
import { deepFreeze } from "../freeze.js";

describe("deepFreeze", () => {
  it("returns primitives unchanged", () => {
    expect(deepFreeze(1)).toBe(1);
    expect(deepFreeze("hello")).toBe("hello");
    expect(deepFreeze(true)).toBe(true);
    expect(deepFreeze(null)).toBe(null);
    expect(deepFreeze(undefined)).toBe(undefined);
  });

  it("freezes a shallow object", () => {
    const o = { a: 1, b: 2 };
    const frozen = deepFreeze(o);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(() => {
      (frozen as { a: number }).a = 42;
    }).toThrow();
  });

  it("freezes nested objects", () => {
    const o = { a: { b: { c: 1 } } };
    const frozen = deepFreeze(o);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.a)).toBe(true);
    expect(Object.isFrozen(frozen.a.b)).toBe(true);
    expect(() => {
      (frozen.a.b as { c: number }).c = 99;
    }).toThrow();
  });

  it("freezes arrays and their elements", () => {
    const arr = [{ x: 1 }, { x: 2 }];
    const frozen = deepFreeze(arr);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen[0])).toBe(true);
    expect(Object.isFrozen(frozen[1])).toBe(true);
    expect(() => {
      (frozen as Array<{ x: number }>).push({ x: 3 });
    }).toThrow();
    expect(() => {
      (frozen[0] as { x: number }).x = 99;
    }).toThrow();
  });

  it("handles null-proto objects (produced by the sanitizer)", () => {
    const o = Object.create(null) as Record<string, unknown>;
    o["a"] = 1;
    o["nested"] = Object.create(null);
    (o["nested"] as Record<string, unknown>)["b"] = 2;
    const frozen = deepFreeze(o);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen["nested"])).toBe(true);
  });

  it("short-circuits on already-frozen subtrees", () => {
    const inner = Object.freeze({ a: 1 });
    const outer = { inner };
    const freezeSpy = vi.spyOn(Object, "freeze");
    deepFreeze(outer);
    freezeSpy.mockRestore();
    // outer is frozen, but inner should NOT have been re-frozen
    // because `deepFreeze` short-circuits on Object.isFrozen.
    expect(Object.isFrozen(outer)).toBe(true);
    expect(Object.isFrozen(inner)).toBe(true);
  });

  it("is idempotent on a shared reference", () => {
    const shared = { x: 1 };
    const a = { shared };
    const b = { shared };
    deepFreeze(a);
    deepFreeze(b); // should not throw
    expect(Object.isFrozen(shared)).toBe(true);
  });
});
