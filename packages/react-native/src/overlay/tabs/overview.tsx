/**
 * The "Overview" tab — the headline view of the debug overlay.
 *
 * Renders the filtered experiment list as a scrollable column of
 * `<ExperimentCard>` instances. Owns the per-card expanded state via
 * a `Set` keyed on experiment id, and surfaces an empty state when
 * no experiments match the current filters.
 */

import type { Experiment, VariantEngine } from "@variantlab/core";
import { type ReactElement, useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ExperimentCard } from "../experiment-card.js";
import type { OverlayTheme } from "../theme.js";

export interface OverviewTabProps {
  theme: OverlayTheme;
  engine: VariantEngine;
  experiments: readonly Experiment[];
  /** Map of experiment id → currently active variant id. */
  variantsById: Readonly<Record<string, string>>;
}

export function OverviewTab({
  theme,
  engine,
  experiments,
  variantsById,
}: OverviewTabProps): ReactElement {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (experiments.length === 0) {
    return (
      <View style={styles.empty} testID="variantlab-overview-empty">
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          No experiments match this view.
        </Text>
        <Text style={[styles.emptyHint, { color: theme.textMuted }]}>
          Clear the search or switch to "All experiments".
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      testID="variantlab-overview-list"
    >
      {experiments.map((exp) => (
        <ExperimentCard
          key={exp.id}
          theme={theme}
          experiment={exp}
          activeVariantId={variantsById[exp.id] ?? exp.default}
          expanded={expanded.has(exp.id)}
          onToggleExpand={() => toggle(exp.id)}
          onSelect={(variantId) => engine.setVariant(exp.id, variantId, "user")}
          onReset={() => engine.clearVariant(exp.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  content: {
    paddingVertical: 8,
  },
  empty: {
    paddingVertical: 32,
    alignItems: "center",
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyHint: {
    fontSize: 12,
  },
});
