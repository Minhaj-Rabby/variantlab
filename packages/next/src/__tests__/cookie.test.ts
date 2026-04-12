import { describe, expect, it } from "vitest";
import {
  decodePayload,
  encodePayload,
  parseCookieHeader,
  serializeCookie,
} from "../server/cookie.js";
import type { StickyCookiePayload } from "../types.js";

describe("parseCookieHeader — hand-rolled tokenizer", () => {
  it("parses a single cookie", () => {
    expect(parseCookieHeader("foo=bar")).toEqual({ foo: "bar" });
  });

  it("parses multiple cookies", () => {
    expect(parseCookieHeader("a=1; b=2; c=3")).toEqual({ a: "1", b: "2", c: "3" });
  });

  it("trims leading whitespace", () => {
    expect(parseCookieHeader("  foo=bar ;   baz=qux  ")).toEqual({ foo: "bar", baz: "qux" });
  });

  it("returns an empty null-proto object for missing/empty input", () => {
    const empty = parseCookieHeader(undefined);
    expect(Object.keys(empty)).toHaveLength(0);
    expect(Object.getPrototypeOf(empty)).toBeNull();
  });

  it("strips double quotes from quoted values", () => {
    expect(parseCookieHeader('foo="bar"')).toEqual({ foo: "bar" });
  });

  it("URL-decodes values", () => {
    expect(parseCookieHeader("msg=hello%20world")).toEqual({ msg: "hello world" });
  });

  it("rejects reserved names (__proto__, constructor, prototype)", () => {
    const parsed = parseCookieHeader("__proto__=polluted; constructor=bad; foo=ok");
    expect(parsed).toEqual({ foo: "ok" });
    // biome-ignore lint/suspicious/noExplicitAny: probing prototype pollution
    expect(({} as any).polluted).toBeUndefined();
  });

  it("keeps the first occurrence of a duplicate cookie", () => {
    expect(parseCookieHeader("foo=first; foo=second")).toEqual({ foo: "first" });
  });

  it("drops segments without an `=`", () => {
    expect(parseCookieHeader("orphan; foo=bar; another")).toEqual({ foo: "bar" });
  });

  it("returns an empty object for oversized headers (>8 KB)", () => {
    const big = "a=".concat("x".repeat(10_000));
    const parsed = parseCookieHeader(big);
    expect(Object.keys(parsed)).toHaveLength(0);
  });
});

describe("encodePayload / decodePayload round-trip", () => {
  it("round-trips a simple payload", () => {
    const payload: StickyCookiePayload = {
      v: 1,
      u: "alice",
      a: { hero: "b", cta: "red" },
    };
    const encoded = encodePayload(payload);
    expect(typeof encoded).toBe("string");
    const decoded = decodePayload(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.v).toBe(1);
    expect(decoded!.u).toBe("alice");
    expect(decoded!.a).toEqual({ hero: "b", cta: "red" });
  });

  it("round-trips an empty assignments map", () => {
    const payload: StickyCookiePayload = { v: 1, u: "bob", a: {} };
    const decoded = decodePayload(encodePayload(payload));
    expect(decoded).not.toBeNull();
    expect(decoded!.u).toBe("bob");
    expect(Object.keys(decoded!.a)).toHaveLength(0);
  });

  it("round-trips unicode in user ids and assignments", () => {
    const payload: StickyCookiePayload = {
      v: 1,
      u: "👩‍💻",
      a: { hero: "variant-ßeta" },
    };
    const decoded = decodePayload(encodePayload(payload));
    expect(decoded!.u).toBe("👩‍💻");
    expect(decoded!.a["hero"]).toBe("variant-ßeta");
  });
});

describe("decodePayload — rejects malicious / malformed input", () => {
  it("returns null for garbage base64", () => {
    expect(decodePayload("!!!not base64!!!")).toBeNull();
  });

  it("returns null for undefined / empty string", () => {
    expect(decodePayload(undefined)).toBeNull();
    expect(decodePayload(null)).toBeNull();
    expect(decodePayload("")).toBeNull();
  });

  it("returns null for invalid JSON payloads", () => {
    const raw = btoa("{not json").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(decodePayload(raw)).toBeNull();
  });

  it("returns null for wrong version", () => {
    const json = JSON.stringify({ v: 2, u: "alice", a: {} });
    const raw = btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(decodePayload(raw)).toBeNull();
  });

  it("returns null when userId is missing or empty", () => {
    const json = JSON.stringify({ v: 1, u: "", a: {} });
    const raw = btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(decodePayload(raw)).toBeNull();
  });

  it("strips prototype-pollution keys from the assignments map", () => {
    const json = JSON.stringify({
      v: 1,
      u: "alice",
      a: { __proto__: "polluted", constructor: "bad", hero: "b" },
    });
    const raw = btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const decoded = decodePayload(raw);
    expect(decoded).not.toBeNull();
    expect(decoded!.a).toEqual({ hero: "b" });
    // biome-ignore lint/suspicious/noExplicitAny: probing prototype pollution
    expect(({} as any).polluted).toBeUndefined();
  });

  it("drops non-string assignment values", () => {
    const json = JSON.stringify({
      v: 1,
      u: "alice",
      a: { hero: 42, cta: null, ok: "valid" },
    });
    const raw = btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const decoded = decodePayload(raw);
    expect(decoded!.a).toEqual({ ok: "valid" });
  });

  it("returns null for oversized payloads (>4 KB)", () => {
    const big = "x".repeat(5000);
    expect(decodePayload(big)).toBeNull();
  });
});

describe("serializeCookie", () => {
  it("serializes a Set-Cookie with sensible defaults", () => {
    const header = serializeCookie("foo", "bar");
    expect(header).toContain("foo=bar");
    expect(header).toContain("Path=/");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Max-Age=");
  });

  it("honors secure, domain, and sameSite overrides", () => {
    const header = serializeCookie("foo", "bar", {
      secure: true,
      domain: "example.com",
      sameSite: "strict",
      httpOnly: false,
    });
    expect(header).toContain("Secure");
    expect(header).toContain("Domain=example.com");
    expect(header).toContain("SameSite=Strict");
    expect(header).not.toContain("HttpOnly");
  });

  it("URL-encodes the value so special characters round-trip", () => {
    const header = serializeCookie("foo", "bar baz=qux");
    expect(header).toContain("foo=bar%20baz%3Dqux");
  });
});
