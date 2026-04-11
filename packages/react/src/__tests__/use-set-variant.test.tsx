/**
 * Tests for `useSetVariant`.
 *
 * The dev-only setter forwards to `engine.setVariant` and must be
 * stable across renders so consumers can pass it into onClick props
 * without memoization concerns.
 */
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VariantLabProvider } from "../context.js";
import { useSetVariant } from "../hooks/use-set-variant.js";
import { useVariant } from "../hooks/use-variant.js";
import { makeEngine } from "./fixtures.js";

describe("useSetVariant", () => {
  it("forces variants through the engine", () => {
    const engine = makeEngine();
    const captured: Array<(id: string, v: string) => void> = [];
    function View(): string {
      const active = useVariant("hero-layout");
      const set = useSetVariant();
      captured.push(set);
      return active;
    }
    render(
      <VariantLabProvider engine={engine}>
        <div data-testid="out">
          <View />
        </div>
      </VariantLabProvider>,
    );
    expect(screen.getByTestId("out").textContent).toBe("compact");
    act(() => {
      captured[0]?.("hero-layout", "wide");
    });
    expect(screen.getByTestId("out").textContent).toBe("wide");
    // Setter identity is stable across re-renders.
    expect(captured[captured.length - 1]).toBe(captured[0]);
  });
});
