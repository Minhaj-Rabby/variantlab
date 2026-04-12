/**
 * "Config" tab — high-level summary of the loaded experiments config.
 *
 * Shows the schema version, the total experiment count, the kill-
 * switch state, and a per-experiment list of (id, status, default).
 */

import type { ExperimentsConfig } from "@variantlab/core";
import type { CSSProperties, ReactElement } from "react";
import type { OverlayTheme } from "../theme.js";

export interface ConfigTabProps {
  theme: OverlayTheme;
  config: ExperimentsConfig;
}

export function ConfigTab({ theme, config }: ConfigTabProps): ReactElement {
  const enabled = config.enabled !== false;
  return (
    <div data-testid="variantlab-config-view" style={styles.scroll}>
      <SummaryRow theme={theme} label="Version" value={String(config.version)} />
      <SummaryRow theme={theme} label="Status" value={enabled ? "enabled" : "kill-switched"} />
      <SummaryRow theme={theme} label="Experiments" value={String(config.experiments.length)} />
      <div
        style={{
          ...styles.section,
          borderColor: theme.border,
          backgroundColor: theme.surface,
        }}
      >
        {config.experiments.map((exp) => (
          <div key={exp.id} style={{ ...styles.row, borderBottomColor: theme.border }}>
            <div
              style={{
                ...styles.rowId,
                color: theme.text,
              }}
            >
              {exp.id}
            </div>
            <div
              style={{
                ...styles.rowMeta,
                color: theme.textMuted,
              }}
            >
              {exp.status ?? "active"} &middot; default = {exp.default}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryRow({
  theme,
  label,
  value,
}: {
  theme: OverlayTheme;
  label: string;
  value: string;
}): ReactElement {
  return (
    <div style={styles.summaryRow}>
      <span style={{ ...styles.summaryLabel, color: theme.textMuted }}>{label}</span>
      <span style={{ ...styles.summaryValue, color: theme.text }}>{value}</span>
    </div>
  );
}

const styles = {
  scroll: {
    overflowY: "auto",
    paddingTop: 8,
    paddingBottom: 8,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    paddingLeft: 4,
    paddingRight: 4,
  },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 12, fontWeight: "600" },
  section: {
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "solid",
    paddingTop: 4,
    paddingBottom: 4,
  },
  row: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
  },
  rowId: {
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  rowMeta: { fontSize: 11, marginTop: 2 },
} satisfies Record<string, CSSProperties>;
