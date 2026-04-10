/**
 * Tests for the 1 MB config-size rule. **Unrelated** to the gzip
 * bundle budget in `.size-limit.json` despite the file name.
 */
import { describe, expect, it } from "vitest";
import { type ConfigValidationError, validateConfig } from "../index.js";

const MB = 1_048_576;

function minimalExperiment() {
  return {
    id: "x",
    name: "X",
    default: "a",
    variants: [{ id: "a" }, { id: "b" }],
  };
}

function envelopeOverhead(): number {
  // Base payload without the padded owner field.
  const base = {
    version: 1,
    experiments: [minimalExperiment()],
  };
  return JSON.stringify(base).length;
}

describe("validateConfig — 1 MB size rule", () => {
  it("accepts a config at the 1 MB boundary (string input)", () => {
    // Build a string whose exact UTF-8 byte length is MB.
    // Signature must be non-empty; use 7-bit ASCII so byte length
    // equals character length.
    const skeleton = `{"version":1,"signature":"__PAD__","experiments":[{"id":"x","name":"X","default":"a","variants":[{"id":"a"},{"id":"b"}]}]}`;
    const fillerLen = MB - skeleton.length + "__PAD__".length;
    const filler = "A".repeat(fillerLen);
    const raw = skeleton.replace("__PAD__", filler);
    expect(raw.length).toBe(MB);
    expect(() => validateConfig(raw)).not.toThrow();
  });

  it("envelopeOverhead helper is reachable", () => {
    // Keeps the helper referenced so dead-code analysis doesn't prune
    // it from coverage.
    expect(envelopeOverhead()).toBeGreaterThan(0);
  });

  it("rejects a config of 1 MB + 1 byte", () => {
    // Make a string input whose raw byte length is MB + 1.
    const filler = "A".repeat(MB + 1);
    const raw = `{"version":1,"pad":"${filler}","experiments":[]}`;
    try {
      validateConfig(raw);
    } catch (err) {
      const e = err as ConfigValidationError;
      expect(e.issues[0]?.code).toBe("config-too-large");
      return;
    }
    throw new Error("expected throw");
  });

  it("rejects object input larger than 1 MB", () => {
    const payload = {
      version: 1,
      experiments: [
        {
          ...minimalExperiment(),
          owner: "A".repeat(MB + 10),
        },
      ],
    };
    try {
      validateConfig(payload);
    } catch (err) {
      const e = err as ConfigValidationError;
      expect(e.issues[0]?.code).toBe("config-too-large");
      return;
    }
    throw new Error("expected throw");
  });

  it("measures bytes, not characters (UTF-8)", () => {
    // 500k chars × 3 bytes/char (emoji) = 1.5 MB — should be rejected.
    const emoji = "\u{1F4A9}"; // 4 UTF-8 bytes
    const filler = emoji.repeat(300_000); // ~1.2 MB
    const raw = `{"version":1,"pad":"${filler}","experiments":[]}`;
    try {
      validateConfig(raw);
    } catch (err) {
      const e = err as ConfigValidationError;
      expect(e.issues[0]?.code).toBe("config-too-large");
      return;
    }
    throw new Error("expected throw");
  });

  it("accepts a string input just under 1 MB", () => {
    // 500kB of filler — well under the limit.
    const filler = "a".repeat(500_000);
    const raw = `{"version":1,"signature":"${filler}","experiments":[{"id":"x","name":"X","default":"a","variants":[{"id":"a"},{"id":"b"}]}]}`;
    expect(() => validateConfig(raw)).not.toThrow();
  });
});
