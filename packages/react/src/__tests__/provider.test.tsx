/**
 * Tests for `VariantLabProvider`.
 *
 * Exercises:
 *   - Children render with an engine in context.
 *   - `useVariantLabEngine()` throws when no provider wraps the tree.
 *   - `initialContext` is applied before the first meaningful render
 *     (variant reflects the updated context).
 *   - Unmounting the provider does NOT dispose the engine (the
 *     consumer owns the lifecycle of the engine it passed in).
 */
import { render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { VariantLabProvider } from "../context.js";
import { useVariant } from "../hooks/use-variant.js";
import { useVariantLabEngine } from "../hooks/use-variant-lab-engine.js";
import { makeEngine } from "./fixtures.js";

function Shows(): string {
  return useVariant("hero-layout");
}

describe("VariantLabProvider", () => {
  it("exposes the engine to descendants", () => {
    const engine = makeEngine();
    render(
      <VariantLabProvider engine={engine}>
        <div data-testid="out">
          <Shows />
        </div>
      </VariantLabProvider>,
    );
    expect(screen.getByTestId("out").textContent).toBe("compact");
  });

  it("throws when a hook is used outside a provider", () => {
    function Bare(): string {
      useVariantLabEngine();
      return "unreached";
    }
    expect(() => render(<Bare />)).toThrow(/VariantLabProvider/);
  });

  it("applies initialContext so the engine cache reflects new targeting inputs", () => {
    const engine = makeEngine();
    // Seed a forced variant to prove the context application path doesn't
    // accidentally reset overrides.
    engine.setVariant("hero-layout", "wide");
    render(
      <VariantLabProvider engine={engine} initialContext={{ userId: "alice" }}>
        <div data-testid="out">
          <Shows />
        </div>
      </VariantLabProvider>,
    );
    expect(screen.getByTestId("out").textContent).toBe("wide");
  });

  it("applies initialContext exactly once under StrictMode double-invoke", () => {
    // StrictMode re-runs useLayoutEffect to flush out side-effect bugs.
    // Our provider guards against this with a ref so updateContext is
    // a true no-op on the second invocation.
    const engine = makeEngine();
    const spy = vi.spyOn(engine, "updateContext");
    const initialContext = { userId: "alice" };
    render(
      <StrictMode>
        <VariantLabProvider engine={engine} initialContext={initialContext}>
          <Shows />
        </VariantLabProvider>
      </StrictMode>,
    );
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("does not dispose the engine when the provider unmounts", () => {
    const engine = makeEngine();
    const { unmount } = render(
      <VariantLabProvider engine={engine}>
        <Shows />
      </VariantLabProvider>,
    );
    unmount();
    // Engine should still be usable.
    expect(engine.getVariant("hero-layout")).toBe("compact");
  });
});
