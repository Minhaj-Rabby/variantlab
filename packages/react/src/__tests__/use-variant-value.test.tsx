/**
 * Tests for `useVariantValue`.
 *
 * Value experiments must return the primitive `value` from the
 * matching variant and re-render when the active variant flips.
 */
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VariantLabProvider } from "../context.js";
import { useVariantValue } from "../hooks/use-variant-value.js";
import { makeEngine } from "./fixtures.js";

describe("useVariantValue", () => {
  it("returns the value of the active variant", () => {
    const engine = makeEngine();
    function View(): string {
      return useVariantValue<string>("cta-copy");
    }
    render(
      <VariantLabProvider engine={engine}>
        <div data-testid="out">
          <View />
        </div>
      </VariantLabProvider>,
    );
    expect(screen.getByTestId("out").textContent).toBe("Buy now");
  });

  it("re-renders with the new value when the variant changes", () => {
    const engine = makeEngine();
    function View(): string {
      return useVariantValue<string>("cta-copy");
    }
    render(
      <VariantLabProvider engine={engine}>
        <div data-testid="out">
          <View />
        </div>
      </VariantLabProvider>,
    );
    act(() => {
      engine.setVariant("cta-copy", "get-started");
    });
    expect(screen.getByTestId("out").textContent).toBe("Get started");
  });
});
