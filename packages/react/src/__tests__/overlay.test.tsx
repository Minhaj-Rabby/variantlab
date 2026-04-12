/**
 * Component-level smoke test for the web debug overlay surface.
 *
 * Uses `@testing-library/react` + jsdom to render the overlay and
 * verify basic rendering behaviour: floating button badge, overview
 * tab experiments, and the full overlay mounting without errors.
 */

import { render, screen } from "@testing-library/react";
import { createEngine, type ExperimentsConfig } from "@variantlab/core";

import { describe, expect, it } from "vitest";
import { VariantLabProvider } from "../context.js";
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
    render(
      <FloatingButton
        theme={DEFAULT_THEME}
        corner="bottom-right"
        offset={{ x: 16, y: 80 }}
        count={3}
        onPress={() => undefined}
      />,
    );
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("omits the badge when count is zero", () => {
    render(
      <FloatingButton
        theme={DEFAULT_THEME}
        corner="top-left"
        offset={{ x: 0, y: 0 }}
        count={0}
        onPress={() => undefined}
      />,
    );
    expect(screen.queryByText("0")).toBeNull();
  });
});

describe("OverviewTab", () => {
  it("renders a row for every visible experiment", () => {
    const engine = createEngine(config);
    render(
      <OverviewTab
        theme={DEFAULT_THEME}
        engine={engine}
        experiments={engine.getExperiments().filter((e) => e.status !== "archived")}
        variantsById={{ "hero-card": "variant-a" }}
      />,
    );
    expect(screen.getByText("Hero card layout")).toBeTruthy();
    // Archived experiment is filtered out at the caller.
    expect(screen.queryByText("Old promo banner")).toBeNull();
  });

  it("shows the empty state for a zero-length list", () => {
    const engine = createEngine(config);
    render(
      <OverviewTab theme={DEFAULT_THEME} engine={engine} experiments={[]} variantsById={{}} />,
    );
    expect(screen.getByText(/No experiments/)).toBeTruthy();
  });
});

describe("VariantDebugOverlay", () => {
  it("renders when forceEnable is true and a provider is mounted", () => {
    const engine = createEngine(config);
    expect(() =>
      render(
        <VariantLabProvider engine={engine}>
          <VariantDebugOverlay forceEnable />
        </VariantLabProvider>,
      ),
    ).not.toThrow();
  });

  it("renders the floating button with badge when forceEnable is true", () => {
    const engine = createEngine(config);
    render(
      <VariantLabProvider engine={engine}>
        <VariantDebugOverlay forceEnable />
      </VariantLabProvider>,
    );
    // The floating button should be present
    expect(screen.getByTestId("variantlab-floating-button")).toBeTruthy();
  });

  it("mounts without errors when hideButton is true", () => {
    const engine = createEngine(config);
    expect(() =>
      render(
        <VariantLabProvider engine={engine}>
          <VariantDebugOverlay forceEnable hideButton />
        </VariantLabProvider>,
      ),
    ).not.toThrow();
  });
});
