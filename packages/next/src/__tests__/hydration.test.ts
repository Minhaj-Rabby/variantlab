/**
 * Hydration determinism test.
 *
 * Proves that the server engine and the client engine, given the same
 * userId and the same config, produce identical variants across every
 * assignment strategy. This is the guarantee the Next adapter relies on
 * to avoid SSR hydration mismatches.
 *
 * In production the client engine receives `initialAssignments` from
 * the server payload. The test also verifies that a seeded client
 * engine returns the same variants as an unseeded client engine — so
 * seeding is a performance optimization, not a correctness hack.
 */

import { createEngine } from "@variantlab/core";
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
        name: "Hero copy",
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
        name: "CTA color",
        type: "value",
        default: "blue",
        assignment: "sticky-hash",
        variants: [
          { id: "blue", value: "#00f" },
          { id: "red", value: "#f00" },
          { id: "green", value: "#0f0" },
        ],
      },
      {
        id: "layout",
        name: "Layout",
        default: "compact",
        assignment: "weighted",
        split: { compact: 50, expanded: 50 },
        variants: [{ id: "compact" }, { id: "expanded" }],
      },
    ],
  };
}

function cookieHeaderFor(payload: StickyCookiePayload): string {
  return `__variantlab_sticky=${encodePayload(payload)}`;
}

describe("SSR → CSR hydration determinism", () => {
  it("server and client agree on variants for the same userId", () => {
    const server = createVariantLabServer(fixtureConfig());
    const payload: StickyCookiePayload = { v: 1, u: "alice", a: {} };
    const header = cookieHeaderFor(payload);

    const serverHero = server.getVariant("hero", header);
    const serverCta = server.getVariant("cta", header);
    const serverLayout = server.getVariant("layout", header);

    // Now simulate the client: build an engine with the same config
    // and same userId, *without* the SSR-computed assignments seed.
    const clientEngine = createEngine(fixtureConfig(), {
      context: { userId: "alice" },
    });

    expect(clientEngine.getVariant("hero")).toBe(serverHero);
    expect(clientEngine.getVariant("cta")).toBe(serverCta);
    expect(clientEngine.getVariant("layout")).toBe(serverLayout);
  });

  it("seeded client engine returns the same variants as an unseeded one", () => {
    const server = createVariantLabServer(fixtureConfig());
    const payload: StickyCookiePayload = { v: 1, u: "alice", a: {} };
    const header = cookieHeaderFor(payload);

    const seededAssignments: Record<string, string> = {
      hero: server.getVariant("hero", header),
      cta: server.getVariant("cta", header),
      layout: server.getVariant("layout", header),
    };

    const seededClient = createEngine(fixtureConfig(), {
      context: { userId: "alice" },
      initialAssignments: seededAssignments,
    });
    const unseededClient = createEngine(fixtureConfig(), {
      context: { userId: "alice" },
    });

    for (const expId of ["hero", "cta", "layout"]) {
      expect(seededClient.getVariant(expId)).toBe(unseededClient.getVariant(expId));
    }
  });

  it("same userId produces same variants across 50 independent resolutions", () => {
    const server = createVariantLabServer(fixtureConfig());
    const payload: StickyCookiePayload = { v: 1, u: "alice", a: {} };
    const header = cookieHeaderFor(payload);

    const firsts: Record<string, string> = {
      hero: server.getVariant("hero", header),
      cta: server.getVariant("cta", header),
      layout: server.getVariant("layout", header),
    };

    for (let i = 0; i < 50; i++) {
      expect(server.getVariant("hero", header)).toBe(firsts["hero"]);
      expect(server.getVariant("cta", header)).toBe(firsts["cta"]);
      expect(server.getVariant("layout", header)).toBe(firsts["layout"]);
    }
  });

  it("different user IDs produce different variant distributions for sticky-hash", () => {
    const server = createVariantLabServer(fixtureConfig());
    const ids = ["alice", "bob", "carol", "dave", "eve", "frank", "grace", "heidi"];
    const seen = new Set<string>();
    for (const id of ids) {
      const header = cookieHeaderFor({ v: 1, u: id, a: {} });
      seen.add(server.getVariant("cta", header));
    }
    // With 8 users and 3 variants, we expect to see at least 2 distinct
    // variants — otherwise the sticky-hash distribution is broken.
    expect(seen.size).toBeGreaterThanOrEqual(2);
  });

  it("seeded assignments bypass re-evaluation (events audit)", () => {
    const server = createVariantLabServer(fixtureConfig());

    // Server computes the variants first.
    const header0 = cookieHeaderFor({ v: 1, u: "alice", a: {} });
    const assignments: Record<string, string> = {
      hero: server.getVariant("hero", header0),
      cta: server.getVariant("cta", header0),
      layout: server.getVariant("layout", header0),
    };

    // Now simulate second-request hydration: the cookie carries the
    // assignments. A freshly-built engine should return them on the
    // first call without firing an `assignment` event.
    const seededHeader = cookieHeaderFor({ v: 1, u: "alice", a: assignments });
    const events: string[] = [];
    const clientEngine = createEngine(fixtureConfig(), {
      context: { userId: "alice" },
      initialAssignments: assignments,
    });
    clientEngine.subscribe((event) => events.push(event.type));
    clientEngine.getVariant("hero");
    clientEngine.getVariant("cta");
    clientEngine.getVariant("layout");
    expect(events).not.toContain("assignment");

    // And the server also resolves the pre-seeded cookie without drama.
    expect(server.getVariant("hero", seededHeader)).toBe(assignments["hero"]);
    expect(server.getVariant("cta", seededHeader)).toBe(assignments["cta"]);
    expect(server.getVariant("layout", seededHeader)).toBe(assignments["layout"]);
  });
});
