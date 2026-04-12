import { describe, expect, it } from "vitest";
import { encodePayload } from "../server/cookie.js";
import { createVariantLabServer } from "../server/create-variant-lab-server.js";
import type { StickyCookiePayload } from "../types.js";

function fixtureConfig(): unknown {
  return {
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
      {
        id: "cta",
        name: "CTA",
        type: "value",
        default: "blue",
        assignment: "sticky-hash",
        variants: [
          { id: "blue", value: "#00f" },
          { id: "red", value: "#f00" },
        ],
      },
    ],
  };
}

function cookieHeaderFor(payload: StickyCookiePayload): string {
  return `__variantlab_sticky=${encodePayload(payload)}`;
}

describe("createVariantLabServer — factory", () => {
  it("validates the config exactly once", () => {
    const server = createVariantLabServer(fixtureConfig());
    expect(server.config.version).toBe(1);
    expect(server.config.experiments).toHaveLength(2);
  });

  it("throws on invalid config", () => {
    expect(() => createVariantLabServer({ version: 99 })).toThrow();
  });

  it("returns deterministic variants for the same cookie", () => {
    const server = createVariantLabServer(fixtureConfig());
    const header = cookieHeaderFor({ v: 1, u: "alice", a: {} });
    const first = server.getVariant("hero", header);
    const second = server.getVariant("hero", header);
    expect(first).toBe(second);
    expect(["a", "b"]).toContain(first);
  });

  it("returns the default when no cookie is supplied", () => {
    const server = createVariantLabServer(fixtureConfig());
    expect(server.getVariant("hero", undefined)).toBe("a");
    expect(server.getVariant("cta", null)).toBe("blue");
  });

  it("honors seeded assignments in the cookie", () => {
    const server = createVariantLabServer(fixtureConfig());
    const header = cookieHeaderFor({ v: 1, u: "alice", a: { hero: "b" } });
    expect(server.getVariant("hero", header)).toBe("b");
    expect(server.getVariantValue("hero", header)).toBe("Beta");
  });

  it("getVariantValue returns the value payload", () => {
    const server = createVariantLabServer(fixtureConfig());
    const header = cookieHeaderFor({ v: 1, u: "alice", a: { cta: "red" } });
    expect(server.getVariantValue("cta", header)).toBe("#f00");
  });

  it("readPayload decodes a valid sticky cookie", () => {
    const server = createVariantLabServer(fixtureConfig());
    const header = cookieHeaderFor({ v: 1, u: "alice", a: { hero: "b" } });
    const decoded = server.readPayload(header);
    expect(decoded).not.toBeNull();
    expect(decoded!.u).toBe("alice");
    expect(decoded!.a).toEqual({ hero: "b" });
  });

  it("writePayload produces a valid Set-Cookie header", () => {
    const server = createVariantLabServer(fixtureConfig());
    const out = server.writePayload({ v: 1, u: "alice", a: {} }, true);
    expect(out).toMatch(/^__variantlab_sticky=/);
    expect(out).toContain("HttpOnly");
    expect(out).toContain("Secure");
    expect(out).toContain("SameSite=Lax");
  });

  it("toProviderProps returns initialContext + initialVariants", () => {
    const server = createVariantLabServer(fixtureConfig());
    const header = cookieHeaderFor({ v: 1, u: "alice", a: { hero: "b" } });
    const props = server.toProviderProps(header, { locale: "en" });
    expect(props.initialContext?.userId).toBe("alice");
    expect(props.initialContext?.locale).toBe("en");
    expect(props.initialVariants).toEqual({ hero: "b" });
  });

  it("toProviderProps still works without a cookie", () => {
    const server = createVariantLabServer(fixtureConfig());
    const props = server.toProviderProps(null);
    expect(props.initialContext).toBeDefined();
    expect(props.initialVariants).toEqual({});
  });

  it("uses a custom cookie name when configured", () => {
    const server = createVariantLabServer(fixtureConfig(), { cookieName: "vl" });
    const header = `vl=${encodePayload({ v: 1, u: "alice", a: { hero: "b" } })}`;
    expect(server.getVariant("hero", header)).toBe("b");
    const out = server.writePayload({ v: 1, u: "alice", a: {} });
    expect(out).toMatch(/^vl=/);
  });

  it("does not share engine state across concurrent resolutions", () => {
    const server = createVariantLabServer(fixtureConfig());
    const a = cookieHeaderFor({ v: 1, u: "alice", a: { hero: "a" } });
    const b = cookieHeaderFor({ v: 1, u: "bob", a: { hero: "b" } });
    expect(server.getVariant("hero", a)).toBe("a");
    expect(server.getVariant("hero", b)).toBe("b");
    expect(server.getVariant("hero", a)).toBe("a");
  });
});
