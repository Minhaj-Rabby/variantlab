/**
 * "Context" tab — JSON-tree view of the active `VariantContext`.
 *
 * The implementation is intentionally dumb: stringify the context with
 * 2-space indentation, render it inside a monospace `<pre>` block,
 * and let the user scroll.
 */

import type { VariantContext } from "@variantlab/core";
import type { CSSProperties, ReactElement } from "react";
import type { OverlayTheme } from "../theme.js";

export interface ContextTabProps {
  theme: OverlayTheme;
  context: VariantContext;
}

export function ContextTab({ theme, context }: ContextTabProps): ReactElement {
  const json = stringifyContext(context);
  return (
    <div data-testid="variantlab-context-view" style={styles.scroll}>
      <pre style={{ ...styles.json, color: theme.text }}>{json}</pre>
    </div>
  );
}

/** Mask the userId so screenshots don't leak PII. */
export function stringifyContext(context: VariantContext): string {
  const masked: Record<string, unknown> = { ...context };
  if (typeof masked.userId === "string" && masked.userId.length > 0) {
    masked.userId = maskId(masked.userId);
  }
  return JSON.stringify(masked, null, 2);
}

function maskId(id: string): string {
  if (id.length <= 4) return "***";
  return `${id.slice(0, 2)}\u2026${id.slice(-2)}`;
}

const styles = {
  scroll: {
    overflowY: "auto",
    paddingTop: 8,
    paddingBottom: 8,
    flex: 1,
  },
  json: {
    fontSize: 11,
    fontFamily: "Menlo, Consolas, monospace",
    lineHeight: 1.5,
    margin: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
} satisfies Record<string, CSSProperties>;
