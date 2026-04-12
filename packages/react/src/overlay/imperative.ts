/**
 * Imperative open / close API for the debug overlay.
 *
 * Some debug surfaces want to open the overlay from outside React —
 * a keyboard shortcut handler, a dev-tools extension, a custom menu
 * item. We expose a tiny pub/sub so any number of mounted overlays
 * can be opened in lock-step:
 *
 *   import { openDebugOverlay } from "@variantlab/react/debug";
 *
 *   document.addEventListener("keydown", (e) => {
 *     if (e.key === "F12" && e.shiftKey) openDebugOverlay();
 *   });
 *
 * The overlay registers/unregisters its `setVisible` callback in
 * `useEffect`, and the imperative helpers fan calls out to every
 * registered callback. In practice almost every app mounts a single
 * overlay so the set has size 1; the registry simply guarantees we
 * don't crash if a developer mounts two.
 */

const subscribers = new Set<(visible: boolean) => void>();

export function registerOverlay(setVisible: (visible: boolean) => void): () => void {
  subscribers.add(setVisible);
  return () => {
    subscribers.delete(setVisible);
  };
}

export function openDebugOverlay(): void {
  for (const fn of subscribers) fn(true);
}

export function closeDebugOverlay(): void {
  for (const fn of subscribers) fn(false);
}
