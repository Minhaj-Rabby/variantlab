/**
 * "Context" tab — JSON-tree view of the active `VariantContext`.
 *
 * The implementation is intentionally dumb: stringify the context with
 * 2-space indentation, render it inside a monospace `<Text>` block,
 * and let the user scroll. Recursive React-tree expansion would look
 * nicer but isn't worth the bundle size for a debug surface.
 */

import type { VariantContext } from "@variantlab/core";
import type { ReactElement } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import type { OverlayTheme } from "../theme.js";

export interface ContextTabProps {
  theme: OverlayTheme;
  context: VariantContext;
}

export function ContextTab({ theme, context }: ContextTabProps): ReactElement {
  const json = stringifyContext(context);
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      testID="variantlab-context-view"
    >
      <Text style={[styles.json, { color: theme.text }]}>{json}</Text>
    </ScrollView>
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
  return `${id.slice(0, 2)}…${id.slice(-2)}`;
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  content: { paddingVertical: 8 },
  json: {
    fontSize: 11,
    fontFamily: "Menlo, monospace",
    lineHeight: 16,
  },
});
