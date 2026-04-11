/**
 * `useVariantValue` — read a "value" experiment's typed payload.
 *
 * Thin wrapper around `useVariant` that looks up the matching
 * `variant.value` from the engine. Used for copy, pricing, feature
 * toggles, and any other experiment where the thing that varies is
 * data, not a React component.
 *
 * The generic `T` exists purely for type inference ergonomics. When
 * codegen is active it's filled in automatically from
 * `GeneratedExperiments[id]["value"]`; otherwise callers pass an
 * explicit type parameter.
 */
import { useVariant } from "./use-variant.js";
import { useVariantLabEngine } from "./use-variant-lab-engine.js";

export function useVariantValue<T = unknown>(experimentId: string): T {
  const engine = useVariantLabEngine();
  // Track the variant id so we re-render when it changes. The actual
  // value is fetched via `getVariantValue` which walks the variant
  // table; this is O(n_variants) which is fine for typical configs.
  useVariant(experimentId);
  return engine.getVariantValue<T>(experimentId);
}
