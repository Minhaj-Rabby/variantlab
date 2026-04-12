/**
 * Cross-cutting hook used by every overlay surface to keep itself in
 * sync with the engine.
 *
 * The implementation uses `React.useSyncExternalStore` so the overlay
 * is correct under Concurrent Mode and Strict Mode — it never
 * over-renders on unrelated event types and never holds a stale
 * subscription across remounts.
 *
 * Each call site provides its own selector + comparator so subscribing
 * to "the list of all experiments on the current route" doesn't
 * needlessly invalidate when, say, a `contextUpdated` event fires.
 */

import type { EngineEvent, VariantEngine } from "@variantlab/core";
import { useCallback, useRef, useSyncExternalStore } from "react";

/**
 * Subscribe to a slice of engine state. The selector is invoked
 * lazily by `useSyncExternalStore`; the result is cached in a ref so
 * a stable reference is returned for unchanged snapshots.
 */
export function useEngineSnapshot<T>(
  engine: VariantEngine,
  select: (engine: VariantEngine) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const cache = useRef<{ value: T } | null>(null);

  const subscribe = useCallback(
    (notify: () => void) => {
      const unsub = engine.subscribe((_event: EngineEvent) => notify());
      return unsub;
    },
    [engine],
  );

  const getSnapshot = useCallback((): T => {
    const next = select(engine);
    const prev = cache.current;
    if (prev !== null && isEqual(prev.value, next)) {
      return prev.value;
    }
    cache.current = { value: next };
    return next;
  }, [engine, select, isEqual]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
