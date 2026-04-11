/**
 * `<Variant>` — render-prop switch for "render" experiments.
 *
 * Takes a plain `Record<variantId, ReactNode>` as its children. The
 * shape intentionally looks like a lookup table so grep, codegen, and
 * TypeScript exhaustiveness checks all work without any custom
 * helpers. If the active variant isn't in the table we render
 * `fallback` if provided, else `null` — silent render failures are
 * preferable to crashing the tree when a config is missing a case.
 *
 * This component is tiny on purpose: the real logic lives in
 * `useVariant`, and everything here is table lookup plus a fallback.
 */
import type { ReactNode } from "react";
import { useVariant } from "../hooks/use-variant.js";

export interface VariantProps {
  readonly experimentId: string;
  readonly children: Readonly<Record<string, ReactNode>>;
  readonly fallback?: ReactNode;
}

export function Variant({ experimentId, children, fallback }: VariantProps): ReactNode {
  const active = useVariant(experimentId);
  const node = children[active];
  if (node !== undefined) return node;
  return fallback ?? null;
}
