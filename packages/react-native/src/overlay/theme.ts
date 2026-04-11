/**
 * Default colour palette for the debug overlay.
 *
 * The overlay deliberately ships a built-in dark theme rather than
 * trying to follow the host app's theme — debug surfaces look better
 * when they're visually distinct from production UI, and a fixed
 * palette lets us hand-tune contrast for WCAG AA without depending
 * on a styling library.
 *
 * Users override the palette via the `theme` prop on
 * `<VariantDebugOverlay />`, e.g.:
 *
 *   <VariantDebugOverlay theme={{ accent: "#a78bfa" }} />
 */

export interface OverlayTheme {
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  danger: string;
}

export const DEFAULT_THEME: OverlayTheme = {
  background: "#0b0b10",
  surface: "#161620",
  border: "#272735",
  text: "#f4f4f5",
  textMuted: "#9ca3af",
  accent: "#8b5cf6",
  accentText: "#ffffff",
  danger: "#f43f5e",
};

export function mergeTheme(base: OverlayTheme, patch?: Partial<OverlayTheme>): OverlayTheme {
  if (patch === undefined) return base;
  return { ...base, ...patch };
}
