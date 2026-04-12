"use client";

/**
 * `@variantlab/next/debug` — Next.js re-export of the React debug overlay.
 *
 * Wraps `@variantlab/react/debug` with the `"use client"` directive
 * so the overlay works correctly in Next.js App Router without the
 * consumer having to add a client boundary themselves.
 */

export type { Corner, OverlayTheme, VariantDebugOverlayProps } from "@variantlab/react/debug";
export {
  closeDebugOverlay,
  DEFAULT_THEME,
  describeAssignmentSource,
  filterExperiments,
  isVisibleExperiment,
  matchesSearch,
  mergeTheme,
  openDebugOverlay,
  registerOverlay,
  stringifyContext,
  summarizeEvent,
  VariantDebugOverlay,
} from "@variantlab/react/debug";
