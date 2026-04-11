/**
 * `useVariant` — read the current variant id for an experiment.
 *
 * Subscribes to engine events via `useSyncExternalStore` so that the
 * component re-renders whenever the variant for this experiment
 * actually changes (manual override, rollback, config reload, context
 * update). Events that don't affect this experiment are filtered out
 * at the listener level — React's bail-out on identical snapshots
 * handles the rest.
 *
 * The snapshot callback is `engine.getVariant(id)` directly. The
 * engine memoizes the result in an internal cache, so repeated reads
 * in the same render pass are O(1) and side-effect free — which is
 * exactly what `useSyncExternalStore` requires.
 */

import type { EngineEvent } from "@variantlab/core";
import { useCallback, useSyncExternalStore } from "react";
import { useVariantLabEngine } from "./use-variant-lab-engine.js";

export function useVariant(experimentId: string): string {
  const engine = useVariantLabEngine();

  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      return engine.subscribe((event: EngineEvent) => {
        if (shouldNotify(event, experimentId)) onStoreChange();
      });
    },
    [engine, experimentId],
  );

  const getSnapshot = useCallback(
    (): string => engine.getVariant(experimentId),
    [engine, experimentId],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Decide whether an engine event should retrigger snapshot sampling.
 * Broad events (`configLoaded`, `contextUpdated`) always fire; targeted
 * events fire only when they name this experiment.
 */
function shouldNotify(event: EngineEvent, experimentId: string): boolean {
  switch (event.type) {
    case "configLoaded":
    case "contextUpdated":
      return true;
    case "variantChanged":
    case "rollback":
    case "assignment":
      return event.experimentId === experimentId;
    default:
      return false;
  }
}
