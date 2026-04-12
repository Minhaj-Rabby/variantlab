"use client";

/**
 * Next-specific `VariantLabProvider` Client Component.
 *
 * Wraps `@variantlab/react`'s provider. The engine is constructed via
 * `useMemo` keyed on the config/context/variants identity so a stable
 * imported JSON module yields a stable engine across renders and
 * StrictMode double-invocation.
 *
 * Crucially, `initialContext` is passed to `createEngine`, not to the
 * inner React provider. That avoids the inner provider's
 * `useLayoutEffect` branch, which would emit an SSR warning when this
 * component is rendered on the server as part of a Client Component
 * tree.
 *
 * `initialVariants` is forwarded via the new core option
 * `initialAssignments`, seeding the engine cache so the first
 * `getVariant` call short-circuits on the exact variants the server
 * rendered. Zero re-evaluation on first render → zero hydration
 * mismatches.
 */

import { createEngine } from "@variantlab/core";
import { VariantLabProvider as CoreVariantLabProvider } from "@variantlab/react";
import { type ReactNode, useMemo } from "react";
import type { VariantLabProviderProps } from "../types.js";

/**
 * Named `NextVariantLabProvider` internally to avoid colliding with the
 * re-export name `VariantLabProvider` once tsup bundles
 * `@variantlab/react` inline. Exposed publicly as `VariantLabProvider`
 * via the barrel in `./hooks.ts`.
 */
export function NextVariantLabProvider({
  config,
  initialContext,
  initialVariants,
  children,
}: VariantLabProviderProps): ReactNode {
  const engine = useMemo(
    () =>
      createEngine(config, {
        ...(initialContext !== undefined ? { context: initialContext } : {}),
        ...(initialVariants !== undefined ? { initialAssignments: initialVariants } : {}),
      }),
    // Stable JSON module → stable identity → stable engine.
    [config, initialContext, initialVariants],
  );
  return <CoreVariantLabProvider engine={engine}>{children}</CoreVariantLabProvider>;
}
