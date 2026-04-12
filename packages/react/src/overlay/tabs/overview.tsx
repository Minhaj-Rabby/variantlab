/**
 * The "Overview" tab — the headline view of the debug overlay.
 *
 * Renders the filtered experiment list as a scrollable column of
 * `<ExperimentCard>` instances. Owns the per-card expanded state via
 * a `Set` keyed on experiment id, and surfaces an empty state when
 * no experiments match the current filters.
 */

import type { Experiment, VariantEngine } from "@variantlab/core";
import { type CSSProperties, type ReactElement, useCallback, useState } from "react";
import { ExperimentCard } from "../experiment-card.js";
import type { OverlayTheme } from "../theme.js";

export interface OverviewTabProps {
  theme: OverlayTheme;
  engine: VariantEngine;
  experiments: readonly Experiment[];
  /** Map of experiment id -> currently active variant id. */
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
      <div data-testid="variantlab-overview-empty" style={styles.empty}>
        <div style={{ ...styles.emptyTitle, color: theme.text }}>
          No experiments match this view.
        </div>
        <div style={{ ...styles.emptyHint, color: theme.textMuted }}>
          Clear the search or switch to &quot;All experiments&quot;.
        </div>
      </div>
    );
  }

  return (
    <div data-testid="variantlab-overview-list" style={styles.scroll}>
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
    </div>
  );
}

const styles = {
  scroll: {
    overflowY: "auto",
    paddingTop: 8,
    paddingBottom: 8,
    flex: 1,
  },
  empty: {
    paddingTop: 32,
    paddingBottom: 32,
    display: "flex",
    flexDirection: "column",
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
} satisfies Record<string, CSSProperties>;
