import { describe, expect, it } from "vitest";
import { canonicalStringify } from "../canonical.js";

describe("canonicalStringify", () => {
  it("sorts object keys", () => {
    expect(canonicalStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalStringify({ b: 1, a: 2 })).toBe(canonicalStringify({ a: 2, b: 1 }));
  });

  it("sorts nested object keys", () => {
    const a = { outer: { z: 1, a: 2 }, b: 3 };
    const b = { b: 3, outer: { a: 2, z: 1 } };
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
    expect(canonicalStringify(a)).toBe('{"b":3,"outer":{"a":2,"z":1}}');
  });

  it("preserves array order (no sort)", () => {
    expect(canonicalStringify([3, 1, 2])).toBe("[3,1,2]");
    expect(canonicalStringify(["b", "a"])).toBe('["b","a"]');
  });

  it("serializes primitives", () => {
    expect(canonicalStringify(null)).toBe("null");
    expect(canonicalStringify(true)).toBe("true");
    expect(canonicalStringify(false)).toBe("false");
    expect(canonicalStringify(42)).toBe("42");
    expect(canonicalStringify(3.14)).toBe("3.14");
    expect(canonicalStringify(0)).toBe("0");
    expect(canonicalStringify(-0)).toBe("0");
    expect(canonicalStringify("hello")).toBe('"hello"');
  });

  it("throws on non-finite numbers", () => {
    expect(() => canonicalStringify(Number.NaN)).toThrow("canonical/non-finite-number");
    expect(() => canonicalStringify(Number.POSITIVE_INFINITY)).toThrow(
      "canonical/non-finite-number",
    );
    expect(() => canonicalStringify(Number.NEGATIVE_INFINITY)).toThrow(
      "canonical/non-finite-number",
    );
  });

  it("throws on BigInt", () => {
    expect(() => canonicalStringify(1n)).toThrow("canonical/bigint-not-supported");
  });

  it("throws on functions and symbols", () => {
    expect(() => canonicalStringify(() => 1)).toThrow("canonical/unsupported-type");
    expect(() => canonicalStringify(Symbol("x"))).toThrow("canonical/unsupported-type");
  });

  it("throws on top-level undefined", () => {
    expect(() => canonicalStringify(undefined)).toThrow("canonical/undefined-at-top-level");
  });

  it("drops undefined values from objects", () => {
    expect(canonicalStringify({ a: 1, b: undefined, c: 3 })).toBe('{"a":1,"c":3}');
  });

  it("converts undefined array elements to null", () => {
    expect(canonicalStringify([1, undefined, 3])).toBe("[1,null,3]");
  });

  it("escapes special characters in strings", () => {
    expect(canonicalStringify('hello "world"')).toBe('"hello \\"world\\""');
    expect(canonicalStringify("line\nfeed")).toBe('"line\\nfeed"');
    expect(canonicalStringify("tab\there")).toBe('"tab\\there"');
    expect(canonicalStringify("back\\slash")).toBe('"back\\\\slash"');
  });

  it("round-trips simple values via JSON.parse", () => {
    const value = { a: 1, b: "two", c: [1, 2, 3], d: { nested: true } };
    expect(JSON.parse(canonicalStringify(value))).toEqual(value);
  });

  it("handles empty containers", () => {
    expect(canonicalStringify({})).toBe("{}");
    expect(canonicalStringify([])).toBe("[]");
    expect(canonicalStringify("")).toBe('""');
  });

  it("ignores reserved keys defensively", () => {
    const o: Record<string, unknown> = { a: 1 };
    Object.defineProperty(o, "__proto__", {
      value: { polluted: true },
      enumerable: true,
      configurable: true,
      writable: true,
    });
    // Reserved key should not appear in the output.
    const out = canonicalStringify(o);
    expect(out).toBe('{"a":1}');
  });

  it("handles deeply-nested but finite structures", () => {
    // Build a 10-level deep object.
    let v: unknown = 42;
    for (let i = 0; i < 10; i++) {
      v = { nested: v };
    }
    const s = canonicalStringify(v);
    expect(s.startsWith('{"nested":')).toBe(true);
  });

  it("throws on over-deep structures", () => {
    let v: unknown = 42;
    for (let i = 0; i < 600; i++) {
      v = { nested: v };
    }
    expect(() => canonicalStringify(v)).toThrow("canonical/max-depth-exceeded");
  });
});
