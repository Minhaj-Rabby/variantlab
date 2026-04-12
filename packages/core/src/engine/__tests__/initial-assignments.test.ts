import { describe, expect, it, vi } from "vitest";
import type { EngineEvent } from "../../history/events.js";
import { createEngine } from "../index.js";

function config(): unknown {
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
    ],
  };
}

describe("EngineOptions.initialAssignments — SSR hydration seed", () => {
  it("returns seeded variants on first call without re-evaluation", () => {
    const engine = createEngine(config(), {
      context: { userId: "alice" },
      initialAssignments: { hero: "b", cta: "red" },
    });
    expect(engine.getVariant("hero")).toBe("b");
    expect(engine.getVariant("cta")).toBe("red");
    expect(engine.getVariantValue("hero")).toBe("Beta");
    expect(engine.getVariantValue("cta")).toBe("#f00");
  });

  it("does not emit an assignment event on seeded lookups", () => {
    const engine = createEngine(config(), {
      context: { userId: "alice" },
      initialAssignments: { hero: "b" },
    });
    const events: EngineEvent[] = [];
    engine.subscribe((event) => events.push(event));
    engine.getVariant("hero");
    expect(events.find((e) => e.type === "assignment")).toBeUndefined();
  });

  it("still resolves unseeded experiments normally", () => {
    const engine = createEngine(config(), {
      context: { userId: "alice" },
      initialAssignments: { hero: "b" },
    });
    const cta = engine.getVariant("cta");
    expect(["blue", "red", "green"]).toContain(cta);
    // Without seeding, getVariant must emit an `assignment` event.
    const fresh = createEngine(config(), { context: { userId: "alice" } });
    const observed: EngineEvent[] = [];
    fresh.subscribe((e) => observed.push(e));
    fresh.getVariant("cta");
    expect(observed.some((e) => e.type === "assignment")).toBe(true);
  });

  it("ignores seeds for unknown experiments", () => {
    const spy = vi.fn();
    const engine = createEngine(config(), {
      initialAssignments: { unknown: "x", hero: "a" },
    });
    engine.subscribe(spy);
    expect(engine.getVariant("hero")).toBe("a");
    // fail-open: unknown id resolves to default "" (no experiment) without throwing
    expect(() => engine.getVariant("unknown")).not.toThrow();
  });

  it("ignores seeds whose variant id is not in the experiment", () => {
    const engine = createEngine(config(), {
      context: { userId: "alice" },
      initialAssignments: { hero: "ghost" },
    });
    // "ghost" is not a valid hero variant → seed is dropped → normal resolution.
    const v = engine.getVariant("hero");
    expect(["a", "b"]).toContain(v);
    expect(v).not.toBe("ghost");
  });

  it("ignores seeds with non-string values", () => {
    const engine = createEngine(config(), {
      context: { userId: "alice" },
      // @ts-expect-error — deliberately passing a bad shape
      initialAssignments: { hero: 42, cta: null },
    });
    const hero = engine.getVariant("hero");
    expect(["a", "b"]).toContain(hero);
  });

  it("ignores seeds with empty-string values", () => {
    const engine = createEngine(config(), {
      context: { userId: "alice" },
      initialAssignments: { hero: "" },
    });
    const hero = engine.getVariant("hero");
    expect(["a", "b"]).toContain(hero);
  });

  it("seeded entries are cleared on updateContext (cache is rebuilt)", () => {
    const engine = createEngine(config(), {
      context: { userId: "alice" },
      initialAssignments: { hero: "b" },
    });
    // First call returns seeded value.
    expect(engine.getVariant("hero")).toBe("b");
    // Switch user; cache is cleared, next getVariant re-runs sticky-hash for "bob".
    engine.updateContext({ userId: "bob" });
    const after = engine.getVariant("hero");
    expect(["a", "b"]).toContain(after);
  });
});
