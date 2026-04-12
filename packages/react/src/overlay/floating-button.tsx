/**
 * The floating debug button.
 *
 * A 48x48 circular button fixed-positioned in one of the four screen
 * corners. Renders a badge with the count of route-scoped experiments
 * so users see at a glance how many things they can tweak on the
 * current screen.
 *
 * Implementation notes:
 *
 *   - We draw a simple beaker glyph with a couple of `<div>` elements.
 *     The icon is recognisable enough at 24px, costs nothing in bundle
 *     size, and requires no SVG dependency.
 *   - The badge collapses when there are zero experiments — showing
 *     `0` is more confusing than no badge at all.
 *   - The component does not subscribe to engine events itself; the
 *     parent passes `count` so a single subscription drives the whole
 *     overlay.
 */
import type { CSSProperties, ReactElement } from "react";
import type { OverlayTheme } from "./theme.js";

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface FloatingButtonProps {
  theme: OverlayTheme;
  corner: Corner;
  offset: { x: number; y: number };
  count: number;
  onPress: () => void;
}

export function FloatingButton({
  theme,
  corner,
  offset,
  count,
  onPress,
}: FloatingButtonProps): ReactElement {
  const positionStyle = cornerStyle(corner, offset);
  return (
    <button
      type="button"
      aria-label="Open variantlab debug overlay"
      onClick={onPress}
      data-testid="variantlab-floating-button"
      style={{
        ...styles.button,
        ...positionStyle,
        backgroundColor: theme.accent,
      }}
    >
      <BeakerIcon color={theme.accentText} />
      {count > 0 ? (
        <div
          style={{
            ...styles.badge,
            backgroundColor: theme.surface,
            borderColor: theme.accent,
          }}
        >
          <span style={{ ...styles.badgeText, color: theme.text }}>{String(count)}</span>
        </div>
      ) : null}
    </button>
  );
}

function BeakerIcon({ color }: { color: string }): ReactElement {
  return (
    <div style={styles.iconWrap}>
      <div style={{ ...styles.iconNeck, backgroundColor: color }} />
      <div style={{ ...styles.iconBody, borderColor: color }} />
    </div>
  );
}

function cornerStyle(corner: Corner, offset: { x: number; y: number }): CSSProperties {
  switch (corner) {
    case "top-left":
      return { top: offset.y, left: offset.x };
    case "top-right":
      return { top: offset.y, right: offset.x };
    case "bottom-left":
      return { bottom: offset.y, left: offset.x };
    case "bottom-right":
      return { bottom: offset.y, right: offset.x };
  }
}

const styles = {
  button: {
    position: "fixed",
    width: 48,
    height: 48,
    borderRadius: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    cursor: "pointer",
    padding: 0,
    zIndex: 2147483647,
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingLeft: 4,
    paddingRight: 4,
    borderWidth: 1,
    borderStyle: "solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 1,
  },
  iconWrap: {
    width: 24,
    height: 24,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  iconNeck: {
    width: 4,
    height: 6,
  },
  iconBody: {
    width: 18,
    height: 14,
    borderWidth: 2,
    borderStyle: "solid",
    borderRadius: 3,
    borderTopWidth: 0,
    boxSizing: "border-box",
  },
} satisfies Record<string, CSSProperties>;
