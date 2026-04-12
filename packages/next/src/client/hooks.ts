"use client";

/**
 * Client-side hooks + components for `@variantlab/next`.
 *
 * Re-exports the public surface of `@variantlab/react` (hooks +
 * components) plus a Next-specific `useNextRouteExperiments()` that
 * reads `usePathname()` from `next/navigation` so consumers don't
 * have to thread the route through by hand.
 *
 * NOTE: `@variantlab/react` is bundled *into* this file (not marked
 * external) so the symbols have local bindings in the emitted JS.
 * Next's client-reference loader cannot follow `export { X } from
 * "<workspace-pkg>"` chains across `transpilePackages` boundaries
 * in dev mode, so we eliminate the boundary entirely for the client
 * entrypoint. The server entrypoint still treats `@variantlab/react`
 * as external because it never crosses a client boundary.
 */

import type { Experiment } from "@variantlab/core";
import { useRouteExperiments } from "@variantlab/react";
// `next/navigation` is listed as a peer dep (via `next`) so this
// import is resolved by Next's bundler at build time.
import { usePathname } from "next/navigation";

export type {
  UseExperimentResult,
  VariantErrorBoundaryProps,
  VariantProps,
  VariantValueProps,
} from "@variantlab/react";
export {
  useExperiment,
  useRouteExperiments,
  useSetVariant,
  useVariant,
  useVariantLabEngine,
  useVariantValue,
  Variant,
  VariantErrorBoundary,
  VariantLabContext,
  VariantValue,
} from "@variantlab/react";
export type { VariantLabProviderProps } from "../types.js";
export { NextVariantLabProvider as VariantLabProvider } from "./provider.js";

/**
 * Like `useRouteExperiments(route)`, but reads the current route from
 * `next/navigation`'s `usePathname()` so you never need to pass it
 * explicitly.
 */
export function useNextRouteExperiments(): readonly Experiment[] {
  const pathname = usePathname();
  return useRouteExperiments(pathname ?? undefined);
}
