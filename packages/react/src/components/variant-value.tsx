/**
 * `<VariantValue>` — function-as-child helper for "value" experiments.
 *
 * Lets callers declaratively render with a typed variant value without
 * having to import `useVariantValue` into a component that is
 * otherwise pure JSX. Useful inside dense markup where introducing a
 * hook would require pulling the surrounding code into a wrapper
 * component.
 */
import type { ReactNode } from "react";
import { useVariantValue } from "../hooks/use-variant-value.js";

export interface VariantValueProps<T> {
  readonly experimentId: string;
  readonly children: (value: T) => ReactNode;
}

export function VariantValue<T = unknown>({
  experimentId,
  children,
}: VariantValueProps<T>): ReactNode {
  const value = useVariantValue<T>(experimentId);
  return children(value);
}
