/**
 * Shared test fixtures for the React adapter tests.
 *
 * `baseConfig` returns a realistic two-experiment config (one render,
 * one value) so tests can read + assert without reconstructing a
 * config wall-to-wall. `makeEngine` is a small convenience so each
 * test file doesn't repeat `createEngine(cloneDeep(config), ...)`.
 */
import { createEngine, type VariantEngine } from "@variantlab/core";

export function baseConfig(): unknown {
  return {
    version: 1,
    experiments: [
      {
        id: "cta-copy",
        name: "CTA copy",
        type: "value",
        default: "buy-now",
        variants: [
          { id: "buy-now", value: "Buy now" },
          { id: "get-started", value: "Get started" },
        ],
      },
      {
        id: "hero-layout",
        name: "Hero layout",
        default: "compact",
        variants: [
          { id: "compact", label: "Compact" },
          { id: "wide", label: "Wide" },
        ],
      },
    ],
  };
}

export function makeEngine(userId?: string): VariantEngine {
  return createEngine(baseConfig(), userId !== undefined ? { context: { userId } } : {});
}
