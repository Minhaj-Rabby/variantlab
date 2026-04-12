import { describe, expect, it } from "vitest";
import { encodePayload } from "../server/cookie.js";
import { getVariantSSR, getVariantValueSSR } from "../server/get-variant-ssr.js";
import type { StickyCookiePayload } from "../types.js";

const config = Object.freeze({
  version: 1,
  experiments: [
    {
      id: "hero",
      name: "Hero",
      type: "value",
      default: "a",
      assignment: "sticky-hash",
      variants: [
        { id: "a", value: "Alpha" },
        { id: "b", value: "Beta" },
      ],
    },
  ],
});

function cookieFor(payload: StickyCookiePayload): string {
  return `__variantlab_sticky=${encodePayload(payload)}`;
}

describe("getVariantSSR / getVariantValueSSR", () => {
  it("returns the same variant for the same cookie across calls", () => {
    const header = cookieFor({ v: 1, u: "alice", a: {} });
    const first = getVariantSSR("hero", header, config);
    const second = getVariantSSR("hero", header, config);
    expect(first).toBe(second);
  });

  it("returns seeded variants from the cookie", () => {
    const header = cookieFor({ v: 1, u: "alice", a: { hero: "b" } });
    expect(getVariantSSR("hero", header, config)).toBe("b");
    expect(getVariantValueSSR("hero", header, config)).toBe("Beta");
  });

  it("returns the default when no cookie is supplied", () => {
    expect(getVariantSSR("hero", null, config)).toBe("a");
  });

  it("reuses the validated server across calls (WeakMap cache)", () => {
    // Invoke twice; a perf smoke test. No direct way to observe cache
    // hits from the public surface, but this confirms correctness.
    const header = cookieFor({ v: 1, u: "alice", a: {} });
    const a = getVariantSSR("hero", header, config);
    const b = getVariantSSR("hero", header, config);
    expect(a).toBe(b);
  });

  it("accepts a `Request` as the cookie source", () => {
    const req = new Request("https://example.com/", {
      headers: { cookie: cookieFor({ v: 1, u: "alice", a: { hero: "b" } }) },
    });
    expect(getVariantSSR("hero", req, config)).toBe("b");
  });

  it("accepts a `ReadonlyRequestCookies`-shaped jar", () => {
    const jar = {
      get(name: string) {
        if (name === "__variantlab_sticky") {
          return { value: encodePayload({ v: 1, u: "alice", a: { hero: "b" } }) };
        }
        return undefined;
      },
    };
    expect(getVariantSSR("hero", jar, config)).toBe("b");
  });
});
