/**
 * `useRouteExperiments` — list experiments active on a given route.
 *
 * Pure derivation from `engine.getExperiments(route)`. The challenge
 * is that `engine.getExperiments(route)` allocates a fresh filtered
 * array on every call, which would cause `useSyncExternalStore` to
 * flag an infinite update loop. We cache the snapshot in a ref and
 * invalidate it whenever a relevant engine event fires, so the
 * reference is stable between notifications.
 */

import type { EngineEvent, Experiment } from "@variantlab/core";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { useVariantLabEngine } from "./use-variant-lab-engine.js";

interface Cached {
  readonly route: string | undefined;
  readonly snapshot: readonly Experiment[];
}

export function useRouteExperiments(route?: string): readonly Experiment[] {
  const engine = useVariantLabEngine();
  const cacheRef = useRef<Cached | null>(null);

  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      return engine.subscribe((event: EngineEvent) => {
        if (event.type === "configLoaded" || event.type === "contextUpdated") {
          cacheRef.current = null;
          onStoreChange();
        }
      });
    },
    [engine],
  );

  const getSnapshot = useCallback((): readonly Experiment[] => {
    const cached = cacheRef.current;
    if (cached !== null && cached.route === route) return cached.snapshot;
    const snapshot = engine.getExperiments(route);
    cacheRef.current = { route, snapshot };
    return snapshot;
  }, [engine, route]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
