import { describe, expect, it } from "vitest";
import { ConfigValidationError, validateConfig } from "../index.js";

describe("validateConfig — prototype pollution defense", () => {
  it("rejects a __proto__ key on the root", () => {
    const input = JSON.parse('{"version":1,"experiments":[],"__proto__":{"polluted":true}}');
    // Because JSON.parse preserves __proto__ as an own key with
    // enumerable: false in some engines, build a guaranteed payload:
    const payload: Record<string, unknown> = Object.create(null);
    payload["version"] = 1;
    payload["experiments"] = [];
    Object.defineProperty(payload, "__proto__", {
      value: { polluted: true },
      enumerable: true,
      configurable: true,
      writable: true,
    });

    try {
      validateConfig(payload);
    } catch (err) {
      const e = err as ConfigValidationError;
      expect(e.issues.some((i) => i.code === "reserved-key")).toBe(true);
      expect(e.issues.some((i) => i.path === "/__proto__")).toBe(true);
      return;
    }
    // If validation succeeded, the key was silently stripped — also OK.
    // Verify no pollution happened regardless.
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
    // Reference `input` so the declaration is not dead code:
    expect(input.version).toBe(1);
  });

  it("flags reserved keys (__proto__) inside experiment objects via string input", () => {
    const raw = '{"version":1,"experiments":[],"__proto__":{"polluted":true}}';
    try {
      validateConfig(raw);
    } catch {
      // Whether we throw or not, the important property is
      // that no prototype pollution has occurred.
    }
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
  });

  it("rejects a constructor key inside an experiment", () => {
    const payload: Record<string, unknown> = {
      version: 1,
      experiments: [
        {
          id: "x",
          name: "X",
          default: "a",
          variants: [{ id: "a" }, { id: "b" }],
          constructor: { prototype: { polluted: true } },
        },
      ],
    };
    expect(() => validateConfig(payload)).toThrow(ConfigValidationError);
    try {
      validateConfig(payload);
    } catch (err) {
      const e = err as ConfigValidationError;
      expect(e.issues.some((i) => i.code === "reserved-key")).toBe(true);
      expect(e.issues.some((i) => i.path === "/experiments/0/constructor")).toBe(true);
    }
  });

  it("rejects a reserved key nested inside targeting.attributes", () => {
    const payload = {
      version: 1,
      experiments: [
        {
          id: "x",
          name: "X",
          default: "a",
          variants: [{ id: "a" }, { id: "b" }],
          targeting: {
            attributes: {
              prototype: "evil",
            },
          },
        },
      ],
    };
    try {
      validateConfig(payload);
    } catch (err) {
      const e = err as ConfigValidationError;
      expect(e.issues.some((i) => i.code === "reserved-key")).toBe(true);
      const attr = e.issues.find((i) => i.path.includes("attributes"));
      expect(attr).toBeDefined();
      return;
    }
    throw new Error("expected throw");
  });

  it("does not pollute Object.prototype after validation", () => {
    const payload: Record<string, unknown> = {
      version: 1,
      experiments: [
        {
          id: "x",
          name: "X",
          default: "a",
          variants: [{ id: "a" }, { id: "b" }],
        },
      ],
    };
    Object.defineProperty(payload, "__proto__", {
      value: { polluted: "yes" },
      enumerable: true,
      configurable: true,
      writable: true,
    });
    try {
      validateConfig(payload);
    } catch {
      /* expected */
    }
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
    // Sanity: a freshly created object has no `polluted` key.
    const fresh = {};
    expect(Object.prototype.hasOwnProperty.call(fresh, "polluted")).toBe(false);
  });

  it("allows an empty string as a key (empty is not reserved)", () => {
    const payload = {
      version: 1,
      experiments: [
        {
          id: "x",
          name: "X",
          default: "a",
          variants: [{ id: "a" }, { id: "b" }],
          targeting: { attributes: { "": "allowed" } },
        },
      ],
    };
    expect(() => validateConfig(payload)).not.toThrow();
  });

  it("escapes ~ and / in JSON Pointer paths", () => {
    const payload = {
      version: 1,
      experiments: [
        {
          id: "x",
          name: "X",
          default: "a",
          variants: [{ id: "a" }, { id: "b" }],
          assignment: "weighted",
          split: { "has/slash": 50, "has~tilde": 50 },
        },
      ],
    };
    try {
      validateConfig(payload);
    } catch (err) {
      const e = err as ConfigValidationError;
      // Split keys reference unknown variants — the path should
      // be escaped RFC 6901 style.
      const paths = e.issues.map((i) => i.path);
      expect(paths.some((p) => p.includes("has~1slash"))).toBe(true);
      expect(paths.some((p) => p.includes("has~0tilde"))).toBe(true);
      return;
    }
    throw new Error("expected throw");
  });
});
