/**
 * Tests for `useVariant`.
 *
 * Verifies the hook returns the correct variant, re-renders on
 * override + context changes, and bails out on unrelated engine
 * events (a render counter asserts the latter).
 */
import { act, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it } from "vitest";
import { VariantLabProvider } from "../context.js";
import { useVariant } from "../hooks/use-variant.js";
import { makeEngine } from "./fixtures.js";

describe("useVariant", () => {
  it("returns the current variant id for the experiment", () => {
    const engine = makeEngine();
    function View(): string {
      return useVariant("hero-layout");
    }
    render(
      <VariantLabProvider engine={engine}>
        <div data-testid="out">
          <View />
        </div>
      </VariantLabProvider>,
    );
    expect(screen.getByTestId("out").textContent).toBe("compact");
  });

  it("re-renders when a variant is forced", () => {
    const engine = makeEngine();
    function View(): string {
      return useVariant("hero-layout");
    }
    render(
      <VariantLabProvider engine={engine}>
        <div data-testid="out">
          <View />
        </div>
      </VariantLabProvider>,
    );
    act(() => {
      engine.setVariant("hero-layout", "wide");
    });
    expect(screen.getByTestId("out").textContent).toBe("wide");
  });

  it("re-renders after updateContext when relevant", () => {
    const engine = makeEngine();
    function View(): string {
      return useVariant("hero-layout");
    }
    render(
      <VariantLabProvider engine={engine}>
        <div data-testid="out">
          <View />
        </div>
      </VariantLabProvider>,
    );
    // Switching to a different user id should still resolve — the
    // snapshot query is identical but the event triggers re-sample.
    act(() => {
      engine.updateContext({ userId: "bob" });
    });
    expect(screen.getByTestId("out").textContent).toBe("compact");
  });

  it("does not re-render for unrelated experiment events", () => {
    const engine = makeEngine();
    let renderCount = 0;
    function View(): string {
      const ref = useRef(0);
      ref.current += 1;
      renderCount = ref.current;
      return useVariant("hero-layout");
    }
    render(
      <VariantLabProvider engine={engine}>
        <View />
      </VariantLabProvider>,
    );
    const before = renderCount;
    act(() => {
      engine.setVariant("cta-copy", "get-started");
    });
    expect(renderCount).toBe(before);
  });

  it("re-renders on configLoaded when the engine swaps its config", async () => {
    const engine = makeEngine();
    function View(): string {
      return useVariant("hero-layout");
    }
    render(
      <VariantLabProvider engine={engine}>
        <div data-testid="out">
          <View />
        </div>
      </VariantLabProvider>,
    );
    expect(screen.getByTestId("out").textContent).toBe("compact");
    await act(async () => {
      await engine.loadConfig({
        version: 1,
        experiments: [
          {
            id: "hero-layout",
            name: "Hero layout",
            default: "wide",
            variants: [{ id: "compact" }, { id: "wide" }],
          },
        ],
      });
    });
    expect(screen.getByTestId("out").textContent).toBe("wide");
  });

  it("ignores engine events that aren't part of the notify set", () => {
    // Triggering `getVariant` for an unknown experiment emits an
    // `error` engine event. The hook must treat that as uninteresting
    // (default case in the notify switch) and not force a re-render.
    const engine = makeEngine();
    let renderCount = 0;
    function View(): string {
      const ref = useRef(0);
      ref.current += 1;
      renderCount = ref.current;
      return useVariant("hero-layout");
    }
    render(
      <VariantLabProvider engine={engine}>
        <View />
      </VariantLabProvider>,
    );
    const before = renderCount;
    act(() => {
      // Fail-open mode: this emits an "error" event and returns "".
      engine.getVariant("definitely-not-an-experiment");
    });
    expect(renderCount).toBe(before);
  });
});
