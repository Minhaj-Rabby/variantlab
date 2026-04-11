/**
 * Tests for the deep-link encode/decode and payload validator.
 *
 * The validator is the trust boundary for QR scans, shared URLs, and
 * clipboard pastes — anything that could smuggle adversarial JSON into
 * `engine.setVariant`. These tests exercise the explicit failure modes
 * listed in `docs/features/qr-sharing.md` (§Threats) and on the
 * validator itself.
 */
import { describe, expect, it } from "vitest";
import {
  base64UrlToBytes,
  bytesToBase64Url,
  decodeSharePayload,
  encodeSharePayload,
} from "../deep-link/encode.js";
import type { SharePayload } from "../deep-link/types.js";
import { validatePayload } from "../deep-link/validate.js";

const goodPayload: SharePayload = {
  v: 1,
  overrides: { "hero-card": "variant-b" },
};

describe("validatePayload", () => {
  it("accepts a minimal payload", () => {
    const result = validatePayload(goodPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.overrides["hero-card"]).toBe("variant-b");
    }
  });

  it("rejects non-objects", () => {
    expect(validatePayload(null).ok).toBe(false);
    expect(validatePayload("oops").ok).toBe(false);
    expect(validatePayload([]).ok).toBe(false);
  });

  it("rejects the wrong version tag", () => {
    const r = validatePayload({ v: 2, overrides: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("bad-version");
  });

  it("rejects missing overrides", () => {
    const r = validatePayload({ v: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("missing-overrides");
  });

  it("refuses prototype-pollution keys at any depth", () => {
    const poisoned: unknown = JSON.parse('{"v":1,"overrides":{"__proto__":"bad"}}');
    const r = validatePayload(poisoned);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("prototype-pollution");

    const nested: unknown = JSON.parse(
      '{"v":1,"overrides":{"hero":"a"},"context":{"attributes":{"__proto__":"bad"}}}',
    );
    const r2 = validatePayload(nested);
    expect(r2.ok).toBe(false);
  });

  it("refuses malformed override keys and values", () => {
    const r1 = validatePayload({ v: 1, overrides: { "BAD KEY": "a" } });
    expect(r1.ok).toBe(false);
    const r2 = validatePayload({ v: 1, overrides: { "hero-card": 42 as unknown } });
    expect(r2.ok).toBe(false);
  });

  it("rejects too many overrides", () => {
    const big: Record<string, string> = {};
    for (let i = 0; i < 101; i++) big[`exp-${i}`] = "a";
    const r = validatePayload({ v: 1, overrides: big });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("overrides-too-large");
  });

  it("honors the expires field", () => {
    const expired = validatePayload({ v: 1, overrides: { a: "b" }, expires: 1000 }, 5000);
    expect(expired.ok).toBe(false);
    if (!expired.ok) expect(expired.reason).toBe("expired");

    const fresh = validatePayload({ v: 1, overrides: { a: "b" }, expires: 5000 }, 1000);
    expect(fresh.ok).toBe(true);
  });

  it("sanitizes context into prototype-free objects", () => {
    const r = validatePayload({
      v: 1,
      overrides: { hero: "a" },
      context: { platform: "ios", attributes: { tier: "pro" } },
    });
    expect(r.ok).toBe(true);
    if (r.ok && r.payload.context !== undefined) {
      // The sanitized output is a null-prototype object.
      expect(Object.getPrototypeOf(r.payload.context)).toBeNull();
    }
  });
});

describe("encode / decode share payload round-trip", () => {
  it("encodes and decodes losslessly", () => {
    const encoded = encodeSharePayload(goodPayload);
    const decoded = decodeSharePayload(encoded);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.payload.overrides).toEqual(goodPayload.overrides);
    }
  });

  it("returns an error result for garbage base64", () => {
    const r = decodeSharePayload("!@#$%^");
    expect(r.ok).toBe(false);
  });

  it("handles empty string input", () => {
    const r = decodeSharePayload("");
    expect(r.ok).toBe(false);
  });

  it("throws on encoding an invalid payload", () => {
    expect(() =>
      encodeSharePayload({ v: 1, overrides: { "BAD KEY": "a" } } as SharePayload),
    ).toThrow();
  });
});

describe("base64url codec", () => {
  it("round-trips arbitrary bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 254, 255, 42]);
    const encoded = bytesToBase64Url(bytes);
    const decoded = base64UrlToBytes(encoded);
    expect(Array.from(decoded)).toEqual(Array.from(bytes));
  });

  it("uses url-safe alphabet", () => {
    // Bytes that produce `+` and `/` in standard base64 should use
    // `-` and `_` in base64url. 0xfb 0xff maps to "+/8".
    const bytes = new Uint8Array([0xfb, 0xff]);
    const encoded = bytesToBase64Url(bytes);
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
  });

  it("accepts + and / as aliases on decode", () => {
    // Encoder produces url-safe; decoder should also accept legacy.
    const encoded = bytesToBase64Url(new Uint8Array([0xfb, 0xff]));
    // Replace url-safe chars with their legacy equivalents.
    const legacy = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = base64UrlToBytes(legacy);
    expect(Array.from(decoded)).toEqual([0xfb, 0xff]);
  });

  it("rejects invalid length", () => {
    expect(() => base64UrlToBytes("A")).toThrow();
  });

  it("rejects invalid characters", () => {
    expect(() => base64UrlToBytes("AAA*")).toThrow();
  });
});
