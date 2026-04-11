/**
 * `@variantlab/react` — public API barrel.
 *
 * Every adapter in this package is thin: the heavy lifting is done by
 * `@variantlab/core`'s `VariantEngine`, which this adapter wires into
 * React's rendering model. Callers of `useVariant` never see the
 * engine directly unless they opt in via `useVariantLabEngine`.
 */
export const VERSION = "0.0.0";

export {
  VariantErrorBoundary,
  type VariantErrorBoundaryProps,
} from "./components/error-boundary.js";
export { Variant, type VariantProps } from "./components/variant.js";
export { VariantValue, type VariantValueProps } from "./components/variant-value.js";
export {
  VariantLabContext,
  VariantLabProvider,
  type VariantLabProviderProps,
} from "./context.js";
export { type UseExperimentResult, useExperiment } from "./hooks/use-experiment.js";
export { useRouteExperiments } from "./hooks/use-route-experiments.js";
export { useSetVariant } from "./hooks/use-set-variant.js";
export { useVariant } from "./hooks/use-variant.js";
export { useVariantLabEngine } from "./hooks/use-variant-lab-engine.js";
export { useVariantValue } from "./hooks/use-variant-value.js";
