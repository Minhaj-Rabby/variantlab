import { describe, expect, it } from "vitest";
import type { ExperimentsConfig } from "../index.js";
import { validateConfig } from "../index.js";

function minimal(): unknown {
  return {
    version: 1,
    experiments: [
      {
        id: "exp-a",
        name: "Experiment A",
        default: "a",
        variants: [{ id: "a" }, { id: "b" }],
      },
    ],
  };
}

describe("validateConfig — happy paths", () => {
  it("accepts a minimal valid config", () => {
    const result = validateConfig(minimal());
    expect(result.version).toBe(1);
    expect(result.experiments).toHaveLength(1);
    expect(result.experiments[0]?.id).toBe("exp-a");
  });

  it("accepts a JSON string input", () => {
    const result = validateConfig(JSON.stringify(minimal()));
    expect(result.version).toBe(1);
  });

  it("returns a deeply-frozen tree", () => {
    const result = validateConfig(minimal());
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.experiments)).toBe(true);
    expect(Object.isFrozen(result.experiments[0])).toBe(true);
    expect(Object.isFrozen(result.experiments[0]?.variants)).toBe(true);
    expect(Object.isFrozen(result.experiments[0]?.variants[0])).toBe(true);
  });

  it("rejects mutation after freeze (strict mode)", () => {
    const result = validateConfig(minimal()) as ExperimentsConfig;
    expect(() => {
      (result.experiments as unknown as unknown[]).push({});
    }).toThrow();
  });

  it("passes through unknown top-level fields without complaint", () => {
    // Per config-format.md §Forward compatibility, the engine ignores
    // unknown fields. We preserve them in the validated tree so that
    // tools like the CLI can round-trip a config without data loss.
    const input = { ...(minimal() as object), unknownField: "preserved" };
    const result = validateConfig(input);
    expect((result as unknown as Record<string, unknown>)["unknownField"]).toBe("preserved");
    // And no extraneous issues were raised.
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("accepts a simple value experiment (config-format.md example 1)", () => {
    const config = {
      version: 1,
      experiments: [
        {
          id: "cta-copy",
          name: "CTA button copy",
          type: "value",
          default: "buy-now",
          variants: [
            { id: "buy-now", value: "Buy now" },
            { id: "get-started", value: "Get started" },
            { id: "try-free", value: "Try it free" },
          ],
        },
      ],
    };
    const result = validateConfig(config);
    expect(result.experiments[0]?.type).toBe("value");
    expect(result.experiments[0]?.variants[0]?.value).toBe("Buy now");
  });

  it("accepts a render experiment with route scope (example 2)", () => {
    const config = {
      version: 1,
      experiments: [
        {
          id: "news-card-layout",
          name: "News card layout",
          routes: ["/", "/feed"],
          targeting: { screenSize: ["small"] },
          default: "responsive",
          variants: [
            { id: "responsive", label: "Responsive image" },
            { id: "scale-to-fit", label: "Scale to fit" },
            { id: "pip-thumbnail", label: "PIP thumbnail" },
          ],
        },
      ],
    };
    const result = validateConfig(config);
    expect(result.experiments[0]?.routes).toEqual(["/", "/feed"]);
    expect(result.experiments[0]?.targeting?.screenSize).toEqual(["small"]);
  });

  it("accepts a weighted rollout with rollback (example 3)", () => {
    const config = {
      version: 1,
      experiments: [
        {
          id: "new-checkout",
          name: "New checkout flow",
          assignment: "weighted",
          split: { control: 90, new: 10 },
          default: "control",
          variants: [{ id: "control" }, { id: "new" }],
          rollback: { threshold: 5, window: 120000, persistent: true },
        },
      ],
    };
    const result = validateConfig(config);
    expect(result.experiments[0]?.assignment).toBe("weighted");
    expect(result.experiments[0]?.split).toEqual({ control: 90, new: 10 });
    expect(result.experiments[0]?.rollback?.threshold).toBe(5);
  });

  it("accepts a time-boxed experiment (example 4)", () => {
    const config = {
      version: 1,
      experiments: [
        {
          id: "black-friday-banner",
          name: "Black Friday banner",
          type: "render",
          startDate: "2026-11-24T00:00:00Z",
          endDate: "2026-12-01T00:00:00Z",
          default: "hidden",
          variants: [{ id: "hidden" }, { id: "shown" }],
        },
      ],
    };
    const result = validateConfig(config);
    expect(result.experiments[0]?.startDate).toBe("2026-11-24T00:00:00Z");
    expect(result.experiments[0]?.endDate).toBe("2026-12-01T00:00:00Z");
  });

  it("accepts a targeted beta (example 5)", () => {
    const config = {
      version: 1,
      experiments: [
        {
          id: "ai-assistant",
          name: "AI assistant beta",
          targeting: {
            platform: ["ios", "android"],
            appVersion: ">=2.0.0",
            attributes: { betaOptIn: true },
          },
          default: "disabled",
          variants: [{ id: "disabled" }, { id: "enabled" }],
        },
      ],
    };
    const result = validateConfig(config);
    expect(result.experiments[0]?.targeting?.platform).toEqual(["ios", "android"]);
    expect(result.experiments[0]?.targeting?.appVersion).toBe(">=2.0.0");
  });

  it("accepts optional fields: enabled, signature, description, owner, mutex, overridable", () => {
    const config = {
      version: 1,
      enabled: true,
      signature: "abc123",
      experiments: [
        {
          id: "x",
          name: "X",
          description: "A description",
          owner: "team-growth",
          mutex: "group-1",
          overridable: true,
          status: "active",
          default: "a",
          variants: [{ id: "a", description: "Variant A" }, { id: "b" }],
        },
      ],
    };
    const result = validateConfig(config);
    expect(result.enabled).toBe(true);
    expect(result.experiments[0]?.owner).toBe("team-growth");
    expect(result.experiments[0]?.overridable).toBe(true);
  });

  it("accepts targeting.userId as an explicit list", () => {
    const config = {
      version: 1,
      experiments: [
        {
          id: "t",
          name: "T",
          default: "a",
          variants: [{ id: "a" }, { id: "b" }],
          targeting: { userId: ["alice", "bob"] },
        },
      ],
    };
    expect(() => validateConfig(config)).not.toThrow();
  });

  it("accepts targeting.userId as a hash bucket", () => {
    const config = {
      version: 1,
      experiments: [
        {
          id: "t",
          name: "T",
          default: "a",
          variants: [{ id: "a" }, { id: "b" }],
          targeting: { userId: { hash: "sha256", mod: 10 } },
        },
      ],
    };
    expect(() => validateConfig(config)).not.toThrow();
  });

  it("accepts a semver compound range", () => {
    const config = {
      version: 1,
      experiments: [
        {
          id: "t",
          name: "T",
          default: "a",
          variants: [{ id: "a" }, { id: "b" }],
          targeting: { appVersion: ">=1.0.0 <2.0.0 || >=3.0.0" },
        },
      ],
    };
    expect(() => validateConfig(config)).not.toThrow();
  });

  it("accepts a semver hyphenated range", () => {
    const config = {
      version: 1,
      experiments: [
        {
          id: "t",
          name: "T",
          default: "a",
          variants: [{ id: "a" }, { id: "b" }],
          targeting: { appVersion: "1.2.0 - 2.0.0" },
        },
      ],
    };
    expect(() => validateConfig(config)).not.toThrow();
  });

  it("accepts deep wildcard route globs", () => {
    const config = {
      version: 1,
      experiments: [
        {
          id: "t",
          name: "T",
          default: "a",
          variants: [{ id: "a" }, { id: "b" }],
          routes: ["/docs/**", "/blog/*", "/user/:id"],
        },
      ],
    };
    expect(() => validateConfig(config)).not.toThrow();
  });
});
