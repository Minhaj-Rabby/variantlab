/**
 * Component-level smoke test for the debug overlay surface.
 *
 * We render through `react-dom/server.renderToStaticMarkup` rather
 * than `react-test-renderer` because the latter is deprecated in
 * React 19 and returns `null` for host elements. `renderToStaticMarkup`
 * runs hooks end-to-end in plain Node, and combined with the
 * Fragment-based `react-native` stubs in `setup.ts` it happily walks
 * the whole overlay tree and emits every text node as plain string
 * output.
 *
 * The goal of these tests is reassurance rather than exhaustive
 * coverage — the pure helpers are unit-tested elsewhere. Here we just
 * want to catch regressions where a component fails to render at all.
 */

import { createEngine, type ExperimentsConfig } from "@variantlab/core";
import { VariantLabProvider } from "@variantlab/react";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FloatingButton } from "../overlay/floating-button.js";
import { VariantDebugOverlay } from "../overlay/index.js";
import { OverviewTab } from "../overlay/tabs/overview.js";
import { DEFAULT_THEME } from "../overlay/theme.js";

const config: ExperimentsConfig = {
  version: 1,
  experiments: [
    {
      id: "hero-card",
      name: "Hero card layout",
      default: "variant-a",
      variants: [
        { id: "variant-a", label: "Stacked" },
        { id: "variant-b", label: "Grid" },
        { id: "variant-c", label: "Split" },
      ],
    },
    {
      id: "old-banner",
      name: "Old promo banner",
      status: "archived",
      default: "off",
      variants: [{ id: "off" }, { id: "on" }],
    },
  ],
};

describe("FloatingButton", () => {
  it("renders a badge with the count when count > 0", () => {
    const html = renderToStaticMarkup(
      <FloatingButton
        theme={DEFAULT_THEME}
        corner="bottom-right"
        offset={{ x: 16, y: 80 }}
        count={3}
        onPress={() => undefined}
      />,
    );
    expect(html).toContain("3");
  });

  it("omits the badge when count is zero", () => {
    const html = renderToStaticMarkup(
      <FloatingButton
        theme={DEFAULT_THEME}
        corner="top-left"
        offset={{ x: 0, y: 0 }}
        count={0}
        onPress={() => undefined}
      />,
    );
    // With count=0 the badge branch is not taken, so no "0" text.
    expect(html).not.toContain("0");
  });
});

describe("OverviewTab", () => {
  it("renders a row for every visible experiment", () => {
    const engine = createEngine(config);
    const html = renderToStaticMarkup(
      <OverviewTab
        theme={DEFAULT_THEME}
        engine={engine}
        experiments={engine.getExperiments().filter((e) => e.status !== "archived")}
        variantsById={{ "hero-card": "variant-a" }}
      />,
    );
    expect(html).toContain("Hero card layout");
    // Archived experiment is filtered out at the caller.
    expect(html).not.toContain("Old promo banner");
  });

  it("shows the empty state for a zero-length list", () => {
    const engine = createEngine(config);
    const html = renderToStaticMarkup(
      <OverviewTab theme={DEFAULT_THEME} engine={engine} experiments={[]} variantsById={{}} />,
    );
    expect(html).toContain("No experiments");
  });
});

describe("VariantDebugOverlay", () => {
  it("renders when a provider is mounted", () => {
    const engine = createEngine(config);
    expect(() =>
      renderToStaticMarkup(
        <VariantLabProvider engine={engine}>
          <VariantDebugOverlay hideButton />
        </VariantLabProvider>,
      ),
    ).not.toThrow();
  });

  it("renders the floating button badge", () => {
    const engine = createEngine(config);
    // Two non-archived experiments in the config → badge shows "2".
    const html = renderToStaticMarkup(
      <VariantLabProvider engine={engine}>
        <VariantDebugOverlay />
      </VariantLabProvider>,
    );
    expect(html).toContain("2");
  });

  it("returns null when enabled is false", () => {
    const engine = createEngine(config);
    const html = renderToStaticMarkup(
      <VariantLabProvider engine={engine}>
        <VariantDebugOverlay enabled={false} />
      </VariantLabProvider>,
    );
    expect(html).toBe("");
  });
});
