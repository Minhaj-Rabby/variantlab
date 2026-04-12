import { describe, expect, it, vi } from "vitest";
import { decodePayload, encodePayload } from "../server/cookie.js";
import { variantLabMiddleware } from "../server/middleware.js";
import type { StickyCookiePayload } from "../types.js";

/** Minimal `NextRequest` / `NextResponse` doubles. */
function mockReq(cookieHeader: string | null, protocol: "https:" | "http:" = "https:") {
  return {
    headers: { get: (name: string) => (name === "cookie" ? cookieHeader : null) },
    nextUrl: { protocol },
  };
}

function mockRes() {
  const out: string[] = [];
  return {
    headers: {
      append: (_: string, value: string) => {
        out.push(value);
      },
    },
    setCookies: out,
  };
}

const config = {
  version: 1,
  experiments: [
    {
      id: "hero",
      name: "Hero",
      type: "value",
      default: "a",
      variants: [
        { id: "a", value: "Alpha" },
        { id: "b", value: "Beta" },
      ],
    },
  ],
};

describe("variantLabMiddleware", () => {
  it("mints a fresh cookie on the first request", () => {
    const middleware = variantLabMiddleware(config);
    const res = middleware(mockReq(null), mockRes());
    expect(res.setCookies).toHaveLength(1);
    const [header] = res.setCookies;
    expect(header).toMatch(/^__variantlab_sticky=/);
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("Secure"); // https
  });

  it("decodes to a valid payload with a generated userId", () => {
    const middleware = variantLabMiddleware(config);
    const res = middleware(mockReq(null), mockRes());
    const raw = res.setCookies[0]!.split(";")[0]!.split("=").slice(1).join("=");
    const decoded = decodePayload(decodeURIComponent(raw));
    expect(decoded).not.toBeNull();
    expect(decoded!.v).toBe(1);
    expect(decoded!.u).toBeTypeOf("string");
    expect(decoded!.u.length).toBeGreaterThan(0);
    expect(decoded!.a).toEqual({});
  });

  it("does NOT write a Set-Cookie when a valid cookie is already present", () => {
    const middleware = variantLabMiddleware(config);
    const existing: StickyCookiePayload = { v: 1, u: "alice", a: { hero: "b" } };
    const header = `__variantlab_sticky=${encodePayload(existing)}`;
    const res = middleware(mockReq(header), mockRes());
    expect(res.setCookies).toHaveLength(0);
  });

  it("mints a new cookie when the existing cookie is corrupt", () => {
    const middleware = variantLabMiddleware(config);
    const header = `__variantlab_sticky=NOT_A_VALID_PAYLOAD`;
    const res = middleware(mockReq(header), mockRes());
    expect(res.setCookies).toHaveLength(1);
  });

  it("omits the Secure flag on http", () => {
    const middleware = variantLabMiddleware(config);
    const res = middleware(mockReq(null, "http:"), mockRes());
    expect(res.setCookies[0]).not.toContain("Secure");
  });

  it("is fail-open when the config is invalid", () => {
    const onError = vi.fn();
    const middleware = variantLabMiddleware({ version: 99 }, { onError });
    const res = middleware(mockReq(null), mockRes());
    expect(res.setCookies).toHaveLength(0);
    expect(onError).toHaveBeenCalled();
  });

  it("honors a custom cookieName", () => {
    const middleware = variantLabMiddleware(config, { cookieName: "vl" });
    const res = middleware(mockReq(null), mockRes());
    expect(res.setCookies[0]).toMatch(/^vl=/);
  });

  it("different requests produce different user IDs", () => {
    const middleware = variantLabMiddleware(config);
    const res1 = middleware(mockReq(null), mockRes());
    const res2 = middleware(mockReq(null), mockRes());
    const extract = (setCookie: string): string => {
      const raw = setCookie.split(";")[0]!.split("=").slice(1).join("=");
      return decodePayload(decodeURIComponent(raw))!.u;
    };
    expect(extract(res1.setCookies[0]!)).not.toBe(extract(res2.setCookies[0]!));
  });
});
