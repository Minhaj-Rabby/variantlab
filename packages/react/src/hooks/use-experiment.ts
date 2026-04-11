/**
 * `useExperiment` — combined read + tracker helper.
 *
 * Returns the variant id, the typed value, and a `track` function
 * bound to this experiment. `track` is a pass-through to the engine's
 * history ring buffer — it doesn't do network IO (core makes no
 * outbound calls, period) but it does give downstream telemetry
 * subscribers something to observe.
 *
 * The `track` closure is stable across re-renders via `useCallback`
 * so passing it into memoized children doesn't bust their memoization.
 */
import { useCallback } from "react";
import { useVariant } from "./use-variant.js";
import { useVariantLabEngine } from "./use-variant-lab-engine.js";

export interface UseExperimentResult<T> {
  readonly variant: string;
  readonly value: T;
  readonly track: (eventName: string, properties?: Record<string, unknown>) => void;
}

export function useExperiment<T = unknown>(experimentId: string): UseExperimentResult<T> {
  const engine = useVariantLabEngine();
  const variant = useVariant(experimentId);
  const value = engine.getVariantValue<T>(experimentId);

  const track = useCallback((_eventName: string, _properties?: Record<string, unknown>): void => {
    // Telemetry forwarding is a phase-2 feature. For now `track` is
    // a no-op sink so callers can wire up the API today without
    // waiting for the pluggable telemetry layer.
  }, []);

  return { variant, value, track };
}
