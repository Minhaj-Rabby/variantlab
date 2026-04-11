/**
 * `useVariantLabEngine` — raw engine access escape hatch.
 *
 * Most consumers should reach for `useVariant` / `useVariantValue` /
 * `useExperiment` instead. This hook is for code that needs to call
 * engine methods directly (e.g. `setVariant` from a debug panel, or
 * `reportCrash` from a custom error boundary).
 *
 * Throws synchronously when called outside a `VariantLabProvider`
 * because any other behavior (returning `null`, lazy init) would hide
 * the real bug behind mysterious fallbacks elsewhere in the tree.
 */

import type { VariantEngine } from "@variantlab/core";
import { useContext } from "react";
import { VariantLabContext } from "../context.js";

export function useVariantLabEngine(): VariantEngine {
  const engine = useContext(VariantLabContext);
  if (engine === null) {
    throw new Error("useVariantLabEngine: no <VariantLabProvider> found above this component.");
  }
  return engine;
}
