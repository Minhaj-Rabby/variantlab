/**
 * Side panel for the web debug overlay.
 *
 * Replaces the RN bottom sheet with a right-side slide panel that
 * portals into `document.body` to escape host stacking contexts.
 * Uses CSS `transition` for the slide animation and an `Escape`
 * keydown listener for keyboard dismissal.
 */
import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
} from "react";
import { createPortal } from "react-dom";
import type { OverlayTheme } from "./theme.js";

export interface PanelProps {
  visible: boolean;
  onRequestClose: () => void;
  theme: OverlayTheme;
  children: ReactNode;
}

export function Panel({ visible, onRequestClose, theme, children }: PanelProps): ReactElement {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onRequestClose();
    },
    [onRequestClose],
  );

  useEffect(() => {
    if (visible) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [visible, handleKeyDown]);

  const content = (
    <div
      style={{
        ...styles.root,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* scrim */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Dismiss debug overlay"
        data-testid="variantlab-scrim"
        onClick={onRequestClose}
        style={{
          ...styles.scrim,
          opacity: visible ? 1 : 0,
        }}
      />
      {/* sheet */}
      <div
        data-testid="variantlab-panel"
        style={{
          ...styles.sheet,
          backgroundColor: theme.background,
          borderColor: theme.border,
          transform: visible ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {children}
      </div>
    </div>
  );

  if (typeof document === "undefined") return <>{null}</>;
  return createPortal(content, document.body);
}

const styles = {
  root: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2147483646,
  },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    transition: "opacity 0.2s ease",
  },
  sheet: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 400,
    maxWidth: "100vw",
    borderLeftWidth: 1,
    borderLeftStyle: "solid",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    transition: "transform 0.2s ease",
  },
} satisfies Record<string, CSSProperties>;
