/**
 * React context and provider for variantlab.
 *
 * The provider is a thin wrapper that hands a pre-built `VariantEngine`
 * to descendants via React context. It intentionally does NOT own the
 * engine: callers construct it via `createEngine(...)` and pass it in.
 * That keeps the adapter testable (swap in a mock engine), SSR-safe
 * (server code can build an engine before render), and free of
 * lifecycle surprises — unmounting the provider never disposes the
 * engine because the provider didn't create it.
 *
 * `initialContext`, when supplied, is applied via `useLayoutEffect`
 * before the first browser paint. We use a ref to guard against
 * repeated application on re-renders so the engine cache is only
 * busted when the caller actually swaps engines.
 */

import type { VariantContext, VariantEngine } from "@variantlab/core";
import { createContext, type ReactNode, useLayoutEffect, useMemo, useRef } from "react";

/** The raw context value. `null` until a provider wraps the tree. */
export const VariantLabContext = createContext<VariantEngine | null>(null);

export interface VariantLabProviderProps {
  /** A pre-constructed engine from `createEngine(...)`. */
  readonly engine: VariantEngine;
  /** Optional runtime context applied once on mount. */
  readonly initialContext?: VariantContext;
  readonly children?: ReactNode;
}

/**
 * Wraps descendants so the hooks in this package can locate the engine.
 *
 * The value handed to `Context.Provider` is memoized on `engine` alone
 * so that unrelated parent re-renders don't force a new reference
 * (which would cascade through every `useVariant` consumer).
 */
export function VariantLabProvider({
  engine,
  initialContext,
  children,
}: VariantLabProviderProps): ReactNode {
  // Stable context value: only changes when the engine itself changes.
  const value = useMemo(() => engine, [engine]);

  // Track which (engine, initialContext) pair we've already applied so
  // re-renders don't re-invoke updateContext (which would clear the
  // engine cache and cause unnecessary reassignment events).
  const appliedRef = useRef<{
    readonly engine: VariantEngine;
    readonly ctx: VariantContext | undefined;
  } | null>(null);

  useLayoutEffect(() => {
    if (initialContext === undefined) return;
    const prev = appliedRef.current;
    if (prev !== null && prev.engine === engine && prev.ctx === initialContext) {
      return;
    }
    engine.updateContext(initialContext);
    appliedRef.current = { engine, ctx: initialContext };
  }, [engine, initialContext]);

  return <VariantLabContext.Provider value={value}>{children}</VariantLabContext.Provider>;
}
