/**
 * `<VariantErrorBoundary>` — crash insulation for experiment render trees.
 *
 * Wraps a variant's subtree in a class-based error boundary (the only
 * remaining legitimate use of class components in modern React). When
 * a child throws, it:
 *
 *   1. reports the crash to the engine via `engine.reportCrash(id, err)`,
 *      which feeds the rollback counter defined in `config-format.md`;
 *   2. renders `fallback` (or `null`) for the rest of the current
 *      commit cycle;
 *   3. resets itself so the next render can try again with the new
 *      variant (likely the rolled-back default after N crashes).
 *
 * The engine lookup goes through `VariantLabContext` rather than a
 * prop so the ergonomics match the hook-first API. `contextType` on
 * the class makes the context value available as `this.context` in
 * `componentDidCatch`.
 */

import type { VariantEngine } from "@variantlab/core";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { VariantLabContext } from "../context.js";

export interface VariantErrorBoundaryProps {
  readonly experimentId: string;
  readonly fallback?: ReactNode | ((error: Error) => ReactNode);
  readonly children: ReactNode;
}

interface VariantErrorBoundaryState {
  readonly error: Error | null;
}

export class VariantErrorBoundary extends Component<
  VariantErrorBoundaryProps,
  VariantErrorBoundaryState
> {
  static override contextType = VariantLabContext;
  declare context: VariantEngine | null;
  override state: VariantErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): VariantErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, _info: ErrorInfo): void {
    const engine = this.context;
    if (engine !== null) {
      try {
        engine.reportCrash(this.props.experimentId, error);
      } catch {
        // Swallow crash-reporting failures — we must not double-throw
        // inside an error boundary.
      }
    }
  }

  override componentDidUpdate(prevProps: VariantErrorBoundaryProps): void {
    // If the children prop changes after a recovery (e.g. the engine
    // rolled back and a parent re-rendered with a different subtree),
    // clear the error so we attempt to render the new tree.
    if (this.state.error !== null && prevProps.children !== this.props.children) {
      this.setState({ error: null });
    }
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (error !== null) {
      const { fallback } = this.props;
      if (typeof fallback === "function") return fallback(error);
      return fallback ?? null;
    }
    return this.props.children;
  }
}
