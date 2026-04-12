/**
 * `@variantlab/react/debug` — the debug overlay entrypoint.
 *
 * Kept in a dedicated sub-package so production bundles never import
 * it unless the caller opts in explicitly. Tree-shakeability is a
 * hard requirement and the `@variantlab/react` main-entrypoint size
 * budget excludes whatever lands here.
 *
 * Typical usage:
 *
 *     import { VariantDebugOverlay } from "@variantlab/react/debug";
 *
 *     export default function App() {
 *       return (
 *         <VariantLabProvider engine={engine}>
 *           <Root />
 *           {process.env.NODE_ENV === "development" ? <VariantDebugOverlay /> : null}
 *         </VariantLabProvider>
 *       );
 *     }
 *
 * The `openDebugOverlay` / `closeDebugOverlay` helpers exist for
 * custom triggers (keyboard shortcuts, dev-tools menus) that need
 * to show or hide the overlay from outside the React tree.
 */

export { describeAssignmentSource } from "./overlay/experiment-card.js";
export { filterExperiments, isVisibleExperiment, matchesSearch } from "./overlay/filter.js";
export type { Corner } from "./overlay/floating-button.js";
export {
  closeDebugOverlay,
  openDebugOverlay,
  registerOverlay,
} from "./overlay/imperative.js";
export {
  shouldRender,
  VariantDebugOverlay,
  type VariantDebugOverlayProps,
} from "./overlay/index.js";
export { stringifyContext } from "./overlay/tabs/context.js";
export { summarize as summarizeEvent } from "./overlay/tabs/history.js";
export {
  DEFAULT_THEME,
  mergeTheme,
  type OverlayTheme,
} from "./overlay/theme.js";
