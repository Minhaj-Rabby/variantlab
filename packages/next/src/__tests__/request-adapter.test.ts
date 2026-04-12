import { describe, expect, it } from "vitest";
import { encodePayload, readCookieFromSource, readPayloadFromSource } from "../server/cookie.js";
import type { StickyCookiePayload } from "../types.js";

const payload: StickyCookiePayload = { v: 1, u: "alice", a: { hero: "b" } };
const encoded = encodePayload(payload);

describe("readCookieFromSource — source shape dispatch", () => {
  it("reads from a raw header string", () => {
    const header = `__variantlab_sticky=${encoded}; other=1`;
    expect(readCookieFromSource(header)).toBe(encoded);
  });

  it("reads from a Fetch `Request`", () => {
    const req = new Request("https://example.com/", {
      headers: { cookie: `__variantlab_sticky=${encoded}` },
    });
    expect(readCookieFromSource(req)).toBe(encoded);
  });

  it("reads from a Next `ReadonlyRequestCookies`-shaped object", () => {
    const jar = {
      get(name: string) {
        if (name === "__variantlab_sticky") return { value: encoded };
        return undefined;
      },
    };
    expect(readCookieFromSource(jar)).toBe(encoded);
  });

  it("reads from a Pages Router `NextApiRequest`-shaped object via `cookies`", () => {
    const req = {
      cookies: { __variantlab_sticky: encoded, other: "1" },
      headers: {},
    };
    expect(readCookieFromSource(req)).toBe(encoded);
  });

  it("falls back to the `cookie` header on a Pages Router req without `cookies`", () => {
    const req = {
      headers: { cookie: `__variantlab_sticky=${encoded}` },
    };
    expect(readCookieFromSource(req)).toBe(encoded);
  });

  it("returns undefined for null / undefined sources", () => {
    expect(readCookieFromSource(null)).toBeUndefined();
    expect(readCookieFromSource(undefined)).toBeUndefined();
  });

  it("returns undefined when the cookie is missing from a Fetch Request", () => {
    const req = new Request("https://example.com/");
    expect(readCookieFromSource(req)).toBeUndefined();
  });

  it("readPayloadFromSource decodes in one step", () => {
    const req = new Request("https://example.com/", {
      headers: { cookie: `__variantlab_sticky=${encoded}` },
    });
    const decoded = readPayloadFromSource(req);
    expect(decoded).not.toBeNull();
    expect(decoded!.u).toBe("alice");
    expect(decoded!.a).toEqual({ hero: "b" });
  });

  it("readPayloadFromSource returns null for a missing cookie", () => {
    expect(readPayloadFromSource(new Request("https://example.com/"))).toBeNull();
  });
});
