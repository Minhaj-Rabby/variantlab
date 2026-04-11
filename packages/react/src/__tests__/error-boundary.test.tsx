/**
 * Tests for `<VariantErrorBoundary>`.
 *
 * A child that throws must trigger `engine.reportCrash` with the
 * experiment id and surface the fallback (node or function form).
 * After the error is set, re-renders with new children should clear
 * the boundary so the app can recover without a full remount.
 */
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { VariantErrorBoundary } from "../components/error-boundary.js";
import { VariantLabProvider } from "../context.js";
import { makeEngine } from "./fixtures.js";

function Boom(): never {
  throw new Error("kaboom");
}

describe("<VariantErrorBoundary>", () => {
  it("reports crashes to the engine and renders the fallback node", () => {
    const engine = makeEngine();
    const spy = vi.spyOn(engine, "reportCrash");
    // Silence React's expected error logging for this intentional throw.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <VariantLabProvider engine={engine}>
        <VariantErrorBoundary
          experimentId="hero-layout"
          fallback={<span data-testid="out">fallback-view</span>}
        >
          <Boom />
        </VariantErrorBoundary>
      </VariantLabProvider>,
    );
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("hero-layout", expect.any(Error));
    expect(screen.getByTestId("out").textContent).toBe("fallback-view");
    errSpy.mockRestore();
  });

  it("supports a function fallback that receives the error", () => {
    const engine = makeEngine();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <VariantLabProvider engine={engine}>
        <VariantErrorBoundary
          experimentId="hero-layout"
          fallback={(e) => <span data-testid="out">caught:{e.message}</span>}
        >
          <Boom />
        </VariantErrorBoundary>
      </VariantLabProvider>,
    );
    expect(screen.getByTestId("out").textContent).toBe("caught:kaboom");
    errSpy.mockRestore();
  });

  it("renders null when no fallback is provided", () => {
    const engine = makeEngine();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <VariantLabProvider engine={engine}>
        <VariantErrorBoundary experimentId="hero-layout">
          <Boom />
        </VariantErrorBoundary>
      </VariantLabProvider>,
    );
    expect(container.textContent).toBe("");
    errSpy.mockRestore();
  });

  it("renders children normally when no error is thrown", () => {
    const engine = makeEngine();
    render(
      <VariantLabProvider engine={engine}>
        <VariantErrorBoundary experimentId="hero-layout">
          <span data-testid="out">ok</span>
        </VariantErrorBoundary>
      </VariantLabProvider>,
    );
    expect(screen.getByTestId("out").textContent).toBe("ok");
  });

  it("swallows errors thrown by engine.reportCrash so the boundary never double-throws", () => {
    const engine = makeEngine();
    // Force the crash reporter to blow up — the boundary should
    // survive and still render its fallback.
    vi.spyOn(engine, "reportCrash").mockImplementation(() => {
      throw new Error("telemetry down");
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      render(
        <VariantLabProvider engine={engine}>
          <VariantErrorBoundary
            experimentId="hero-layout"
            fallback={<span data-testid="out">fallback</span>}
          >
            <Boom />
          </VariantErrorBoundary>
        </VariantLabProvider>,
      );
    }).not.toThrow();
    expect(screen.getByTestId("out").textContent).toBe("fallback");
    errSpy.mockRestore();
  });

  it("clears the error on recovery when children swap", () => {
    const engine = makeEngine();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function Harness({ broken }: { broken: boolean }): ReactElement {
      return (
        <VariantLabProvider engine={engine}>
          <VariantErrorBoundary
            experimentId="hero-layout"
            fallback={<span data-testid="out">fallback</span>}
          >
            {broken ? <Boom /> : <span data-testid="out">recovered</span>}
          </VariantErrorBoundary>
        </VariantLabProvider>
      );
    }

    const { rerender } = render(<Harness broken={true} />);
    expect(screen.getByTestId("out").textContent).toBe("fallback");
    rerender(<Harness broken={false} />);
    expect(screen.getByTestId("out").textContent).toBe("recovered");
    errSpy.mockRestore();
  });
});
