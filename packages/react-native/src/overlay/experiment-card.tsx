/**
 * One experiment card in the bottom sheet.
 *
 * Each card collapses by default to keep the list scannable, expands
 * on tap to reveal a radio picker over the variants, and shows the
 * currently active variant with a badge. The card is fully controlled
 * by the parent — expansion state lives in the overlay so toggling
 * one card never re-renders the others.
 *
 * Variant rows expose a row-press handler instead of a real radio
 * widget; React Native's stock <Switch> looks out of place at the
 * sizes we want. The chosen variant gets an inline highlight ring
 * via the theme accent so it's obvious which variant is active.
 */

import type { Experiment } from "@variantlab/core";
import type { ReactElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { OverlayTheme } from "./theme.js";

export interface ExperimentCardProps {
  theme: OverlayTheme;
  experiment: Experiment;
  activeVariantId: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onSelect: (variantId: string) => void;
  onReset: () => void;
}

export function ExperimentCard({
  theme,
  experiment,
  activeVariantId,
  expanded,
  onToggleExpand,
  onSelect,
  onReset,
}: ExperimentCardProps): ReactElement {
  return (
    <View
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      testID={`variantlab-experiment-card-${experiment.id}`}
    >
      <Pressable
        onPress={onToggleExpand}
        accessibilityRole="button"
        accessibilityLabel={`Experiment ${experiment.name}, current variant ${activeVariantId}`}
        style={styles.header}
      >
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {experiment.name}
          </Text>
          <Text style={[styles.id, { color: theme.textMuted }]} numberOfLines={1}>
            {experiment.id}
          </Text>
        </View>
        <View style={[styles.activePill, { backgroundColor: theme.accent }]}>
          <Text style={[styles.activePillText, { color: theme.accentText }]}>
            {activeVariantId}
          </Text>
        </View>
      </Pressable>
      {expanded ? (
        <View style={styles.body}>
          {experiment.variants.map((v) => {
            const isActive = v.id === activeVariantId;
            return (
              <Pressable
                key={v.id}
                onPress={() => onSelect(v.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`Set variant ${v.id}`}
                style={[
                  styles.variantRow,
                  {
                    borderColor: isActive ? theme.accent : theme.border,
                    backgroundColor: isActive ? `${theme.accent}22` : "transparent",
                  },
                ]}
                testID={`variantlab-variant-row-${experiment.id}-${v.id}`}
              >
                <Text style={[styles.variantId, { color: theme.text }]}>{v.label ?? v.id}</Text>
                {v.description !== undefined ? (
                  <Text style={[styles.variantDesc, { color: theme.textMuted }]} numberOfLines={2}>
                    {v.description}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
          <Pressable
            onPress={onReset}
            accessibilityRole="button"
            accessibilityLabel="Reset to default"
            style={styles.resetRow}
            testID={`variantlab-reset-${experiment.id}`}
          >
            <Text style={[styles.resetText, { color: theme.textMuted }]}>Reset to default</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Pure helper used by both the card and the overlay's "manual override"
 * indicator: returns whether the active variant was forced or assigned
 * naturally. Exported so unit tests can exercise the logic without
 * spinning up a renderer.
 */
export function describeAssignmentSource(
  hasOverride: boolean,
  matchedTargeting: boolean,
): "manual override" | "by targeting" | "by default" {
  if (hasOverride) return "manual override";
  if (matchedTargeting) return "by targeting";
  return "by default";
}

// `as unknown as undefined` casts work around the React Native style
// type — the values are real strings the runtime accepts.
const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    overflow: "hidden" as unknown as undefined,
  },
  header: {
    flexDirection: "row" as unknown as undefined,
    alignItems: "center",
    padding: 12,
    gap: 8,
  },
  headerText: {
    flex: 1,
    flexDirection: "column" as unknown as undefined,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
  },
  id: {
    fontSize: 11,
    fontFamily: "Menlo, monospace",
    marginTop: 2,
  },
  activePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  body: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 6,
  },
  variantRow: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  variantId: {
    fontSize: 13,
    fontWeight: "600",
  },
  variantDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  resetRow: {
    paddingVertical: 8,
    alignItems: "flex-end",
  },
  resetText: {
    fontSize: 11,
    textDecorationLine: "underline" as unknown as undefined,
  },
});
