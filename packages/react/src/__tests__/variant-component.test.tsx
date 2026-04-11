/**
 * Tests for `<Variant>`.
 *
 * Covers: correct child rendered for the active variant, fallback
 * rendered for unknown variant ids, and variant swap propagation.
 */
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Variant } from "../components/variant.js";
import { VariantLabProvider } from "../context.js";
import { makeEngine } from "./fixtures.js";

describe("<Variant>", () => {
  it("renders the child matching the active variant", () => {
    const engine = makeEngine();
    render(
      <VariantLabProvider engine={engine}>
        <Variant experimentId="hero-layout">
          {{
            compact: <span data-testid="out">compact-view</span>,
            wide: <span data-testid="out">wide-view</span>,
          }}
        </Variant>
      </VariantLabProvider>,
    );
    expect(screen.getByTestId("out").textContent).toBe("compact-view");
  });

  it("renders the fallback when the variant is not in the children map", () => {
    const engine = makeEngine();
    render(
      <VariantLabProvider engine={engine}>
        <Variant experimentId="hero-layout" fallback={<span data-testid="out">fallback-view</span>}>
          {{
            wide: <span data-testid="out">wide-view</span>,
          }}
        </Variant>
      </VariantLabProvider>,
    );
    expect(screen.getByTestId("out").textContent).toBe("fallback-view");
  });

  it("returns null when no fallback and no matching child", () => {
    const engine = makeEngine();
    const { container } = render(
      <VariantLabProvider engine={engine}>
        <Variant experimentId="hero-layout">{{ unused: <span>u</span> }}</Variant>
      </VariantLabProvider>,
    );
    expect(container.textContent).toBe("");
  });

  it("swaps children when the active variant changes", () => {
    const engine = makeEngine();
    render(
      <VariantLabProvider engine={engine}>
        <Variant experimentId="hero-layout">
          {{
            compact: <span data-testid="out">c</span>,
            wide: <span data-testid="out">w</span>,
          }}
        </Variant>
      </VariantLabProvider>,
    );
    act(() => {
      engine.setVariant("hero-layout", "wide");
    });
    expect(screen.getByTestId("out").textContent).toBe("w");
  });
});
