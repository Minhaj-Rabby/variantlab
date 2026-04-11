/**
 * "Config" tab — high-level summary of the loaded experiments config.
 *
 * Shows the schema version, the total experiment count, the kill-
 * switch state, and a per-experiment list of (id, status, default).
 * The list is virtualised by `<ScrollView>` rather than a `<FlatList>`
 * because debug configs are tiny (the upper bound from
 * `config-format.md` is 1000 experiments and you usually have <50).
 */

import type { ExperimentsConfig } from "@variantlab/core";
import type { ReactElement } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { OverlayTheme } from "../theme.js";

export interface ConfigTabProps {
  theme: OverlayTheme;
  config: ExperimentsConfig;
}

export function ConfigTab({ theme, config }: ConfigTabProps): ReactElement {
  const enabled = config.enabled !== false;
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      testID="variantlab-config-view"
    >
      <SummaryRow theme={theme} label="Version" value={String(config.version)} />
      <SummaryRow theme={theme} label="Status" value={enabled ? "enabled" : "kill-switched"} />
      <SummaryRow theme={theme} label="Experiments" value={String(config.experiments.length)} />
      <View style={[styles.section, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        {config.experiments.map((exp) => (
          <View key={exp.id} style={[styles.row, { borderBottomColor: theme.border }]}>
            <Text style={[styles.rowId, { color: theme.text }]} numberOfLines={1}>
              {exp.id}
            </Text>
            <Text style={[styles.rowMeta, { color: theme.textMuted }]} numberOfLines={1}>
              {exp.status ?? "active"} · default = {exp.default}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
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
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  content: { paddingVertical: 8, gap: 8 },
  summaryRow: {
    flexDirection: "row" as unknown as undefined,
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 12, fontWeight: "600" },
  section: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 4,
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  rowId: { fontSize: 12, fontWeight: "600" },
  rowMeta: { fontSize: 11, marginTop: 2 },
});
