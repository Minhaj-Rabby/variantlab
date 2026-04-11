/**
 * `useSetVariant` — dev-only imperative variant override.
 *
 * Returns a stable setter bound to the current engine. Intended for
 * debug UIs (Storybook, the overlay, dev tools) and QA scripts, not
 * for production logic. Production code should update the config or
 * targeting, not force variants from components.
 */
import { useCallback } from "react";
import { useVariantLabEngine } from "./use-variant-lab-engine.js";

export function useSetVariant(): (experimentId: string, variantId: string) => void {
  const engine = useVariantLabEngine();
  return useCallback(
    (experimentId: string, variantId: string): void => {
      engine.setVariant(experimentId, variantId);
    },
    [engine],
  );
}
