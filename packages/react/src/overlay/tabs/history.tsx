/**
 * "History" tab — scrollable list of recent engine events.
 *
 * Reads from `engine.getHistory()` which is backed by a fixed-size
 * ring buffer. Newest events render at the top so the user always
 * sees the last action they took.
 */

import type { EngineEvent } from "@variantlab/core";
import { type CSSProperties, type ReactElement, useMemo } from "react";
import type { OverlayTheme } from "../theme.js";

export interface HistoryTabProps {
  theme: OverlayTheme;
  events: readonly EngineEvent[];
}

export function HistoryTab({ theme, events }: HistoryTabProps): ReactElement {
  const ordered = useMemo(() => {
    const list: Array<{ seq: number; event: EngineEvent }> = [];
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      if (event !== undefined) list.push({ seq: i, event });
    }
    return list;
  }, [events]);

  if (ordered.length === 0) {
    return (
      <div data-testid="variantlab-history-empty" style={styles.empty}>
        <span style={{ ...styles.emptyText, color: theme.textMuted }}>No events yet.</span>
      </div>
    );
  }

  return (
    <div data-testid="variantlab-history-list" style={styles.scroll}>
      {ordered.map(({ seq, event }) => (
        <div
          key={`${seq}:${event.type}`}
          style={{
            ...styles.row,
            borderColor: theme.border,
            backgroundColor: theme.surface,
          }}
        >
          <div style={{ ...styles.type, color: theme.accent }}>{event.type}</div>
          <div style={{ ...styles.detail, color: theme.text }}>{summarize(event)}</div>
        </div>
      ))}
    </div>
  );
}

/** Render a single event into a one-line human-readable string. */
export function summarize(event: EngineEvent): string {
  switch (event.type) {
    case "ready":
      return `engine ready \u00b7 ${event.config.experiments.length} experiments`;
    case "assignment":
      return `${event.experimentId} \u2192 ${event.variantId}`;
    case "exposure":
      return `${event.experimentId} \u2192 ${event.variantId} (exposure)`;
    case "variantChanged":
      return `${event.experimentId} \u2192 ${event.variantId} (${event.source})`;
    case "rollback":
      return `${event.experimentId} rolled back: ${event.reason}`;
    case "configLoaded":
      return `config reloaded \u00b7 ${event.config.experiments.length} experiments`;
    case "contextUpdated":
      return "context updated";
    case "error":
      return `error: ${event.error.message}`;
  }
}

const styles = {
  scroll: {
    overflowY: "auto",
    paddingTop: 8,
    paddingBottom: 8,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    flex: 1,
  },
  row: {
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "solid",
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 6,
    paddingBottom: 6,
  },
  type: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detail: {
    fontSize: 12,
    marginTop: 2,
  },
  empty: {
    paddingTop: 32,
    paddingBottom: 32,
    display: "flex",
    justifyContent: "center",
  },
  emptyText: { fontSize: 12 },
} satisfies Record<string, CSSProperties>;
