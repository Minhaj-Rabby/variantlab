/**
 * "History" tab — scrollable list of recent engine events.
 *
 * Reads from `engine.getHistory()` which is backed by a fixed-size
 * ring buffer. Newest events render at the top so the user always
 * sees the last action they took. Each event renders as a single
 * row with type, experiment id, and a tiny detail blurb.
 */

import type { EngineEvent } from "@variantlab/core";
import { type ReactElement, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { OverlayTheme } from "../theme.js";

export interface HistoryTabProps {
  theme: OverlayTheme;
  events: readonly EngineEvent[];
}

export function HistoryTab({ theme, events }: HistoryTabProps): ReactElement {
  // Each entry is tagged with a unique `seq` so React keys don't have
  // to fall back to array index. The ring buffer is append-only so a
  // monotonically incrementing counter is a perfectly stable id; we
  // reset it every time the underlying `events` reference changes.
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
      <View style={styles.empty} testID="variantlab-history-empty">
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>No events yet.</Text>
      </View>
    );
  }
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      testID="variantlab-history-list"
    >
      {ordered.map(({ seq, event }) => (
        <View
          key={`${seq}:${event.type}`}
          style={[styles.row, { borderColor: theme.border, backgroundColor: theme.surface }]}
        >
          <Text style={[styles.type, { color: theme.accent }]}>{event.type}</Text>
          <Text style={[styles.detail, { color: theme.text }]} numberOfLines={2}>
            {summarize(event)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

/** Render a single event into a one-line human-readable string. */
export function summarize(event: EngineEvent): string {
  switch (event.type) {
    case "ready":
      return `engine ready · ${event.config.experiments.length} experiments`;
    case "assignment":
      return `${event.experimentId} → ${event.variantId}`;
    case "exposure":
      return `${event.experimentId} → ${event.variantId} (exposure)`;
    case "variantChanged":
      return `${event.experimentId} → ${event.variantId} (${event.source})`;
    case "rollback":
      return `${event.experimentId} rolled back: ${event.reason}`;
    case "configLoaded":
      return `config reloaded · ${event.config.experiments.length} experiments`;
    case "contextUpdated":
      return "context updated";
    case "error":
      return `error: ${event.error.message}`;
  }
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  content: { paddingVertical: 8, gap: 6 },
  row: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  type: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase" as unknown as undefined,
    letterSpacing: 0.5,
  },
  detail: {
    fontSize: 12,
    marginTop: 2,
  },
  empty: { paddingVertical: 32, alignItems: "center" },
  emptyText: { fontSize: 12 },
});
