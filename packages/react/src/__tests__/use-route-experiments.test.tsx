/**
 * Tests for `useRouteExperiments`.
 *
 * Validates that the hook returns the correct filtered list and
 * remains referentially stable across re-renders (so the caller can
 * memoize on it without tearing).
 */
import { act, render, screen } from "@testing-library/react";
import { createEngine } from "@variantlab/core";
import { useRef } from "react";
import { describe, expect, it } from "vitest";
import { VariantLabProvider } from "../context.js";
import { useRouteExperiments } from "../hooks/use-route-experiments.js";

const routedConfig = {
  version: 1,
  experiments: [
    {
      id: "home",
      name: "Home",
      default: "a",
      routes: ["/", "/home"],
      variants: [{ id: "a" }, { id: "b" }],
    },
    {
      id: "feed",
      name: "Feed",
      default: "a",
      routes: ["/feed/*"],
      variants: [{ id: "a" }, { id: "b" }],
    },
    {
      id: "global",
      name: "Global",
      default: "a",
      variants: [{ id: "a" }, { id: "b" }],
    },
  ],
} as const;

describe("useRouteExperiments", () => {
  it("returns all experiments when no route is given", () => {
    const engine = createEngine(routedConfig);
    function View(): string {
      const exps = useRouteExperiments();
      return exps.map((e) => e.id).join(",");
    }
    render(
      <VariantLabProvider engine={engine}>
        <div data-testid="out">
          <View />
        </div>
      </VariantLabProvider>,
    );
    expect(screen.getByTestId("out").textContent).toBe("home,feed,global");
  });

  it("filters by route glob patterns", () => {
    const engine = createEngine(routedConfig);
    function View(): string {
      const exps = useRouteExperiments("/feed/hot");
      return exps.map((e) => e.id).join(",");
    }
    render(
      <VariantLabProvider engine={engine}>
        <div data-testid="out">
          <View />
        </div>
      </VariantLabProvider>,
    );
    expect(screen.getByTestId("out").textContent).toBe("feed,global");
  });

  it("invalidates the cache when the config or context changes", () => {
    const engine = createEngine(routedConfig);
    const snapshots: ReadonlyArray<unknown>[] = [];
    function View(): string {
      const exps = useRouteExperiments("/feed/hot");
      snapshots.push(exps);
      return exps.length.toString();
    }
    render(
      <VariantLabProvider engine={engine}>
        <View />
      </VariantLabProvider>,
    );
    const first = snapshots[0];
    act(() => {
      // contextUpdated is emitted by the engine on every updateContext call.
      engine.updateContext({ route: "/feed/hot" });
    });
    // After a context update the cached snapshot should have been
    // invalidated and a fresh array computed. Identity differs but
    // the contents are the same.
    const latest = snapshots[snapshots.length - 1];
    expect(latest).not.toBe(first);
  });

  it("does not produce a new snapshot reference on unrelated re-renders", () => {
    const engine = createEngine(routedConfig);
    const snapshots: ReadonlyArray<unknown>[] = [];
    function View(): string {
      const ref = useRef(0);
      ref.current += 1;
      const exps = useRouteExperiments("/feed/hot");
      snapshots.push(exps);
      return String(ref.current);
    }
    render(
      <VariantLabProvider engine={engine}>
        <View />
      </VariantLabProvider>,
    );
    // Force a context update that should not change the derived set —
    // the cache must still invalidate (for correctness on arbitrary
    // configs) but within a single commit the snapshot returned from
    // getSnapshot must be stable.
    act(() => {
      engine.setVariant("home", "b"); // unrelated — not a config reload
    });
    // Reference equality: the unrelated event did not touch the cache.
    expect(snapshots[0]).toBe(snapshots[snapshots.length - 1]);
  });
});
