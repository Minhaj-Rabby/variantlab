/// <reference path="./types.d.ts" />
/**
 * `<VariantDebugOverlay />` — the entire debug overlay surface for web.
 *
 * This component lives in a **separate package entrypoint**
 * (`@variantlab/react/debug`) so production bundles never import
 * it unless the app explicitly opts in. Tree-shakeability is a hard
 * requirement and the size budget for `@variantlab/react` excludes
 * this entrypoint entirely.
 *
 * Architectural choices:
 *
 *   - The component reads the engine from `useVariantLabEngine` (the
 *     hook from `@variantlab/react`), so callers mount it inside the
 *     same `<VariantLabProvider>` they already have. No extra wiring.
 *   - All state lives in `useState` / `useRef` — no Context, no
 *     reducer. The overlay is a leaf and never re-renders the host app.
 *   - Engine subscription is consolidated into a single
 *     `useSyncExternalStore` call via `useEngineSnapshot`, then fanned
 *     out to the tab components as plain props.
 *   - The overlay self-disables in production by default. The
 *     `forceEnable` prop is the documented escape hatch for QA builds.
 *   - Uses `createPortal` to `document.body` and a right-side slide
 *     panel (400px) instead of a bottom sheet.
 *   - `Escape` key closes the panel (standard web keyboard convention).
 */

import type { EngineEvent, Experiment, ExperimentsConfig, VariantContext } from "@variantlab/core";
import {
  type CSSProperties,
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useVariantLabEngine } from "../hooks/use-variant-lab-engine.js";
import { filterExperiments } from "./filter.js";
import { type Corner, FloatingButton } from "./floating-button.js";
import { registerOverlay } from "./imperative.js";
import { Panel } from "./panel.js";
import { SearchInput } from "./search-input.js";
import { ConfigTab } from "./tabs/config.js";
import { ContextTab } from "./tabs/context.js";
import { HistoryTab } from "./tabs/history.js";
import { OverviewTab } from "./tabs/overview.js";
import { DEFAULT_THEME, mergeTheme, type OverlayTheme } from "./theme.js";
import { useEngineSnapshot } from "./use-engine-snapshot.js";

type TabName = "overview" | "context" | "config" | "history";

export interface VariantDebugOverlayProps {
  /** Force the overlay on even outside of development. Default: `false`. */
  readonly forceEnable?: boolean | undefined;
  /** Hide the floating button entirely (open via `openDebugOverlay()`). */
  readonly hideButton?: boolean | undefined;
  /** Floating-button corner. */
  readonly position?: Corner | undefined;
  /** Pixel offset from the chosen corner. */
  readonly offset?: { x: number; y: number } | undefined;
  /** Override the colour palette. */
  readonly theme?: Partial<OverlayTheme> | undefined;
  /** Show only experiments active on the current route. Default: `true`. */
  readonly routeFilter?: boolean | undefined;
}

export function VariantDebugOverlay(props: VariantDebugOverlayProps): ReactElement | null {
  if (!shouldRender(props.forceEnable)) {
    if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") {
      // eslint-disable-next-line no-console
      console.warn(
        "[variantlab] VariantDebugOverlay rendered in production. " +
          "Pass forceEnable={true} if this is intentional.",
      );
    }
    return null;
  }
  return <OverlayImpl {...props} />;
}

/**
 * Determines whether the overlay should render. Exported for tests.
 *
 * Order of precedence:
 *   1. Explicit `forceEnable` prop wins.
 *   2. `process.env.NODE_ENV === "development"` (web standard).
 */
export function shouldRender(forceEnable: boolean | undefined): boolean {
  if (forceEnable === true) return true;
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") return true;
  return false;
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
      <Panel visible={visible} onRequestClose={() => setVisible(false)} theme={theme}>
        <Header theme={theme} onClose={() => setVisible(false)} onResetAll={handleResetAll} />
        <SearchInput theme={theme} value={query} onChange={setQuery} />
        <RouteToggle
          theme={theme}
          active={routeFilterActive}
          onToggle={() => setRouteFilterActive((v) => !v)}
        />
        <TabBar theme={theme} value={tab} onChange={setTab} />
        <div style={styles.body}>
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
        </div>
      </Panel>
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
    <div style={styles.header}>
      <span style={{ ...styles.title, color: theme.text }}>variantlab</span>
      <div style={styles.headerActions}>
        <button
          type="button"
          onClick={onResetAll}
          aria-label="Reset all overrides"
          data-testid="variantlab-reset-all"
          style={{
            ...styles.headerButton,
            borderColor: theme.border,
            color: theme.textMuted,
          }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close debug overlay"
          data-testid="variantlab-close"
          style={{
            ...styles.headerButton,
            borderColor: theme.border,
            color: theme.textMuted,
          }}
        >
          Close
        </button>
      </div>
    </div>
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
    <button
      type="button"
      onClick={onToggle}
      aria-label={active ? "Show all experiments" : "Show only current route"}
      data-testid="variantlab-route-toggle"
      style={styles.routeToggle}
    >
      <span style={{ ...styles.routeToggleText, color: theme.textMuted }}>
        {active ? "Showing: current route" : "Showing: all experiments"}
      </span>
    </button>
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
    <div style={{ ...styles.tabBar, borderColor: theme.border }}>
      {tabs.map((t) => {
        const isActive = t === value;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            aria-pressed={isActive}
            aria-label={`${t} tab`}
            data-testid={`variantlab-tab-${t}`}
            style={{
              ...styles.tab,
              borderBottomColor: isActive ? theme.accent : "transparent",
              color: isActive ? theme.text : theme.textMuted,
            }}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerActions: {
    display: "flex",
    gap: 8,
  },
  headerButton: {
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 4,
    paddingBottom: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    background: "transparent",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: "600",
  },
  routeToggle: {
    paddingTop: 8,
    paddingBottom: 8,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
  },
  routeToggleText: {
    fontSize: 11,
  },
  tabBar: {
    display: "flex",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    marginTop: 4,
  },
  tab: {
    flex: 1,
    textAlign: "center",
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomStyle: "solid",
    border: "none",
    borderBottom: "2px solid",
    background: "transparent",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  body: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  },
} satisfies Record<string, CSSProperties>;
