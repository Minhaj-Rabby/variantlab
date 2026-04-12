/// <reference path="../types.d.ts" />
/**
 * `<VariantDebugOverlay />` — the entire debug overlay surface.
 *
 * This component lives in a **separate package entrypoint**
 * (`@variantlab/react-native/debug`) so production bundles never
 * import it unless the app explicitly opts in. The kickoff for
 * Phase 1 (`docs/phases/phase-1-kickoff-prompts.md` §6) calls out
 * tree-shakeability as a hard requirement and the size budget for
 * `@variantlab/react-native` excludes this entrypoint entirely.
 *
 * Architectural choices:
 *
 *   - The component reads the engine from `useVariantLabEngine` (the
 *     hook is re-exported through `@variantlab/react`), so callers
 *     mount it inside the same `<VariantLabProvider>` they already
 *     have. No extra wiring.
 *   - All state lives in `useState` / `useRef` — no Context, no
 *     reducer. The overlay is a leaf and never re-renders the host
 *     app.
 *   - Engine subscription is consolidated into a single
 *     `useSyncExternalStore` call via `useEngineSnapshot`, then
 *     fanned out to the tab components as plain props. This means
 *     toggling between tabs has zero engine-side cost.
 *   - The overlay renders by default. Pass `enabled={false}` to hide it.
 */

import type { EngineEvent, Experiment, ExperimentsConfig, VariantContext } from "@variantlab/core";
import { useVariantLabEngine } from "@variantlab/react";
import { type ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "./bottom-sheet.js";
import { filterExperiments } from "./filter.js";
import { type Corner, FloatingButton } from "./floating-button.js";
import { registerOverlay } from "./imperative.js";
import { SearchInput } from "./search-input.js";
import { ConfigTab } from "./tabs/config.js";
import { ContextTab } from "./tabs/context.js";
import { HistoryTab } from "./tabs/history.js";
import { OverviewTab } from "./tabs/overview.js";
import { DEFAULT_THEME, mergeTheme, type OverlayTheme } from "./theme.js";
import { useEngineSnapshot } from "./use-engine-snapshot.js";

type TabName = "overview" | "context" | "config" | "history";

export interface VariantDebugOverlayProps {
  /** Set to `false` to hide the overlay. Default: `true`. */
  readonly enabled?: boolean;
  /** Hide the floating button entirely (open via `openDebugOverlay()`). */
  readonly hideButton?: boolean;
  /** Floating-button corner. */
  readonly position?: Corner;
  /** Pixel offset from the chosen corner. */
  readonly offset?: { x: number; y: number };
  /** Override the colour palette. */
  readonly theme?: Partial<OverlayTheme>;
  /** Show only experiments active on the current route. Default: `true`. */
  readonly routeFilter?: boolean;
  /** Optional safe-area inset injected by the host. */
  readonly safeAreaBottom?: number;
}

export function VariantDebugOverlay(props: VariantDebugOverlayProps): ReactElement | null {
  if (props.enabled === false) return null;
  return <OverlayImpl {...props} />;
}

function OverlayImpl(props: VariantDebugOverlayProps): ReactElement {
  const engine = useVariantLabEngine();
  const theme = useMemo(() => mergeTheme(DEFAULT_THEME, props.theme), [props.theme]);
  const corner: Corner = props.position ?? "bottom-right";
  const offset = props.offset ?? { x: 16, y: 80 };

  const [visible, setVisible] = useState(false);
  const [tab, setTab] = useState<TabName>("overview");
  const [query, setQuery] = useState("");
  const [routeFilterActive, setRouteFilterActive] = useState<boolean>(props.routeFilter !== false);

  // Register imperative open/close API.
  useEffect(() => registerOverlay(setVisible), []);

  // Pull a single snapshot of every piece of engine state we care about.
  const snapshot = useEngineSnapshot(
    engine,
    useCallback((e) => {
      const ctx = e.getContext();
      const route = typeof ctx.route === "string" ? ctx.route : undefined;
      const all = e.getExperiments();
      const scoped = e.getExperiments(route);
      const variantsById: Record<string, string> = {};
      for (const exp of all) {
        variantsById[exp.id] = e.getVariant(exp.id);
      }
      return {
        all,
        scoped,
        variantsById,
        context: ctx,
        config: e.getConfig(),
        history: e.getHistory(),
      };
    }, []),
    snapshotEqual,
  );

  const visibleExperiments = useMemo(() => {
    const source = routeFilterActive ? snapshot.scoped : snapshot.all;
    return filterExperiments(source, query);
  }, [routeFilterActive, snapshot.scoped, snapshot.all, query]);

  const handleResetAll = useCallback(() => engine.resetAll(), [engine]);

  return (
    <>
      {props.hideButton === true ? null : (
        <FloatingButton
          theme={theme}
          corner={corner}
          offset={offset}
          count={snapshot.scoped.length}
          onPress={() => setVisible(true)}
        />
      )}
      <BottomSheet
        visible={visible}
        onRequestClose={() => setVisible(false)}
        theme={theme}
        insetBottom={props.safeAreaBottom ?? 0}
      >
        <Header theme={theme} onClose={() => setVisible(false)} onResetAll={handleResetAll} />
        <SearchInput theme={theme} value={query} onChange={setQuery} />
        <RouteToggle
          theme={theme}
          active={routeFilterActive}
          onToggle={() => setRouteFilterActive((v) => !v)}
        />
        <TabBar theme={theme} value={tab} onChange={setTab} />
        <View style={styles.body}>
          {tab === "overview" ? (
            <OverviewTab
              theme={theme}
              engine={engine}
              experiments={visibleExperiments}
              variantsById={snapshot.variantsById}
            />
          ) : null}
          {tab === "context" ? <ContextTab theme={theme} context={snapshot.context} /> : null}
          {tab === "config" ? <ConfigTab theme={theme} config={snapshot.config} /> : null}
          {tab === "history" ? <HistoryTab theme={theme} events={snapshot.history} /> : null}
        </View>
      </BottomSheet>
    </>
  );
}

// ---------- private helpers -----------------------------------------------

interface Snapshot {
  all: readonly Experiment[];
  scoped: readonly Experiment[];
  variantsById: Readonly<Record<string, string>>;
  context: VariantContext;
  config: ExperimentsConfig;
  history: readonly EngineEvent[];
}

/**
 * Shallow-compares two {@link Snapshot}s. The engine's getters return
 * a mix of stable references (`getConfig`, unfiltered `getExperiments`)
 * and fresh arrays/objects every call (`getContext`, `getHistory`, the
 * route-filtered `getExperiments`, and our own rebuilt `variantsById`).
 *
 * Comparing everything strictly by reference would make this function
 * return `false` on every call, which in turn would make
 * `useSyncExternalStore` loop forever because `getSnapshot` would
 * never stabilise. So we drop to element-wise identity for the arrays
 * and key-wise identity for the objects — that's O(n) in the number
 * of experiments/events, which is bounded by the config and the
 * history ring buffer.
 */
function snapshotEqual(a: Snapshot, b: Snapshot): boolean {
  if (a.config !== b.config) return false;
  if (!sameRefArray(a.all, b.all)) return false;
  if (!sameRefArray(a.scoped, b.scoped)) return false;
  if (!sameRefArray(a.history, b.history)) return false;
  if (!sameRefRecord(a.variantsById, b.variantsById)) return false;
  if (!sameRefRecord(a.context as Record<string, unknown>, b.context as Record<string, unknown>)) {
    return false;
  }
  return true;
}

function sameRefArray<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function sameRefRecord(
  a: Readonly<Record<string, unknown>>,
  b: Readonly<Record<string, unknown>>,
): boolean {
  if (a === b) return true;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

function Header({
  theme,
  onClose,
  onResetAll,
}: {
  theme: OverlayTheme;
  onClose: () => void;
  onResetAll: () => void;
}): ReactElement {
  return (
    <View style={styles.header}>
      <Text style={[styles.title, { color: theme.text }]}>variantlab</Text>
      <View style={styles.headerActions}>
        <Pressable
          onPress={onResetAll}
          accessibilityRole="button"
          accessibilityLabel="Reset all overrides"
          style={[styles.headerButton, { borderColor: theme.border }]}
          testID="variantlab-reset-all"
        >
          <Text style={[styles.headerButtonText, { color: theme.textMuted }]}>Reset</Text>
        </Pressable>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close debug overlay"
          style={[styles.headerButton, { borderColor: theme.border }]}
          testID="variantlab-close"
        >
          <Text style={[styles.headerButtonText, { color: theme.textMuted }]}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RouteToggle({
  theme,
  active,
  onToggle,
}: {
  theme: OverlayTheme;
  active: boolean;
  onToggle: () => void;
}): ReactElement {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={active ? "Show all experiments" : "Show only current route"}
      style={styles.routeToggle}
      testID="variantlab-route-toggle"
    >
      <Text style={[styles.routeToggleText, { color: theme.textMuted }]}>
        {active ? "Showing: current route" : "Showing: all experiments"}
      </Text>
    </Pressable>
  );
}

function TabBar({
  theme,
  value,
  onChange,
}: {
  theme: OverlayTheme;
  value: TabName;
  onChange: (next: TabName) => void;
}): ReactElement {
  const tabs: TabName[] = ["overview", "context", "config", "history"];
  return (
    <View style={[styles.tabBar, { borderColor: theme.border }]}>
      {tabs.map((t) => {
        const isActive = t === value;
        return (
          <Pressable
            key={t}
            onPress={() => onChange(t)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${t} tab`}
            style={[
              styles.tab,
              isActive ? { borderBottomColor: theme.accent } : { borderBottomColor: "transparent" },
            ]}
            testID={`variantlab-tab-${t}`}
          >
            <Text style={[styles.tabText, { color: isActive ? theme.text : theme.textMuted }]}>
              {t}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row" as unknown as undefined,
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row" as unknown as undefined,
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  headerButtonText: {
    fontSize: 11,
    fontWeight: "600",
  },
  routeToggle: {
    paddingVertical: 8,
  },
  routeToggleText: {
    fontSize: 11,
  },
  tabBar: {
    flexDirection: "row" as unknown as undefined,
    borderTopWidth: 1,
    marginTop: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize" as unknown as undefined,
  },
  body: {
    flexShrink: 1,
  },
});
