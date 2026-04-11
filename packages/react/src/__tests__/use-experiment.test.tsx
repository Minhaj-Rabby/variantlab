/**
 * Tests for `useExperiment`.
 *
 * The combined hook must expose variant, value, and a stable track
 * function. We assert `track` identity is stable across re-renders
 * so it can be passed into memoized children without busting
 * memoization boundaries.
 */
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VariantLabProvider } from "../context.js";
import { useExperiment } from "../hooks/use-experiment.js";
import { makeEngine } from "./fixtures.js";

describe("useExperiment", () => {
  it("returns variant + value + track", () => {
    const engine = makeEngine();
    function View(): string {
      const { variant, value, track } = useExperiment<string>("cta-copy");
      expect(typeof track).toBe("function");
      return `${variant}:${value}`;
    }
    render(
      <VariantLabProvider engine={engine}>
        <div data-testid="out">
          <View />
        </div>
      </VariantLabProvider>,
    );
    expect(screen.getByTestId("out").textContent).toBe("buy-now:Buy now");
  });

  it("keeps track stable across re-renders", () => {
    const engine = makeEngine();
    const seen: Array<(name: string) => void> = [];
    function View(): string {
      const { variant, track } = useExperiment<string>("cta-copy");
      seen.push(track);
      return variant;
    }
    render(
      <VariantLabProvider engine={engine}>
        <View />
      </VariantLabProvider>,
    );
    act(() => {
      engine.setVariant("cta-copy", "get-started");
    });
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen[0]).toBe(seen[seen.length - 1]);
  });

  it("track accepts an event name without throwing", () => {
    const engine = makeEngine();
    function View(): string {
      const { track } = useExperiment("cta-copy");
      track("clicked", { x: 1 });
      return "ok";
    }
    expect(() =>
      render(
        <VariantLabProvider engine={engine}>
          <View />
        </VariantLabProvider>,
      ),
    ).not.toThrow();
  });
});
