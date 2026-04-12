/**
 * One experiment card in the side panel.
 *
 * Each card collapses by default to keep the list scannable, expands
 * on click to reveal a radio picker over the variants, and shows the
 * currently active variant with a badge. The card is fully controlled
 * by the parent — expansion state lives in the overlay so toggling
 * one card never re-renders the others.
 */

import type { Experiment } from "@variantlab/core";
import type { CSSProperties, ReactElement } from "react";
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
    <div
      data-testid={`variantlab-experiment-card-${experiment.id}`}
      style={{
        ...styles.card,
        backgroundColor: theme.surface,
        borderColor: theme.border,
      }}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        aria-label={`Experiment ${experiment.name}, current variant ${activeVariantId}`}
        style={styles.header}
      >
        <div style={styles.headerText}>
          <div
            style={{
              ...styles.name,
              color: theme.text,
            }}
          >
            {experiment.name}
          </div>
          <div
            style={{
              ...styles.id,
              color: theme.textMuted,
            }}
          >
            {experiment.id}
          </div>
        </div>
        <div
          style={{
            ...styles.activePill,
            backgroundColor: theme.accent,
            color: theme.accentText,
          }}
        >
          {activeVariantId}
        </div>
      </button>
      {expanded ? (
        <div style={styles.body}>
          {experiment.variants.map((v) => {
            const isActive = v.id === activeVariantId;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelect(v.id)}
                aria-pressed={isActive}
                aria-label={`Set variant ${v.id}`}
                data-testid={`variantlab-variant-row-${experiment.id}-${v.id}`}
                style={{
                  ...styles.variantRow,
                  borderColor: isActive ? theme.accent : theme.border,
                  backgroundColor: isActive ? `${theme.accent}22` : "transparent",
                }}
              >
                <span style={{ ...styles.variantId, color: theme.text }}>{v.label ?? v.id}</span>
                {v.description !== undefined ? (
                  <span style={{ ...styles.variantDesc, color: theme.textMuted }}>
                    {v.description}
                  </span>
                ) : null}
              </button>
            );
          })}
          <button
            type="button"
            onClick={onReset}
            aria-label="Reset to default"
            data-testid={`variantlab-reset-${experiment.id}`}
            style={styles.resetRow}
          >
            <span
              style={{
                ...styles.resetText,
                color: theme.textMuted,
              }}
            >
              Reset to default
            </span>
          </button>
        </div>
      ) : null}
    </div>
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

const styles = {
  card: {
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    marginBottom: 8,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
    width: "100%",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    textAlign: "left",
  },
  headerText: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  id: {
    fontSize: 11,
    fontFamily: "Menlo, Consolas, monospace",
    marginTop: 2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  activePill: {
    borderRadius: 999,
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 4,
    paddingBottom: 4,
    fontSize: 11,
    fontWeight: "700",
    flexShrink: 0,
  },
  body: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingBottom: 12,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  variantRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "solid",
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 8,
    paddingBottom: 8,
    display: "flex",
    flexDirection: "column",
    width: "100%",
    cursor: "pointer",
    textAlign: "left",
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
    paddingTop: 8,
    paddingBottom: 8,
    display: "flex",
    justifyContent: "flex-end",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    width: "100%",
  },
  resetText: {
    fontSize: 11,
    textDecoration: "underline",
  },
} satisfies Record<string, CSSProperties>;
