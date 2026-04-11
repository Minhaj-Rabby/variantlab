/**
 * Tests for `<VariantValue>`.
 *
 * Function-as-child component that forwards the typed value into its
 * render callback. Covers the happy path and a variant swap.
 */
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VariantValue } from "../components/variant-value.js";
import { VariantLabProvider } from "../context.js";
import { makeEngine } from "./fixtures.js";

describe("<VariantValue>", () => {
  it("invokes children with the current value", () => {
    const engine = makeEngine();
    render(
      <VariantLabProvider engine={engine}>
        <VariantValue<string> experimentId="cta-copy">
          {(value) => <span data-testid="out">{value}</span>}
        </VariantValue>
      </VariantLabProvider>,
    );
    expect(screen.getByTestId("out").textContent).toBe("Buy now");
  });

  it("re-renders when the value changes", () => {
    const engine = makeEngine();
    render(
      <VariantLabProvider engine={engine}>
        <VariantValue<string> experimentId="cta-copy">
          {(value) => <span data-testid="out">{value}</span>}
        </VariantValue>
      </VariantLabProvider>,
    );
    act(() => {
      engine.setVariant("cta-copy", "get-started");
    });
    expect(screen.getByTestId("out").textContent).toBe("Get started");
  });
});
