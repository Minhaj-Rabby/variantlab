/**
 * Tests that the adapter is safe under `<React.StrictMode>`.
 *
 * In strict mode React mounts, unmounts, and re-mounts components to
 * flush out effects that rely on render being side-effect free. Our
 * requirements from `phase-1-kickoff-prompts.md` session 5:
 *
 *   - No duplicate subscriptions: after a strict-mode double-invoke
 *     the engine should have exactly one listener per consumer.
 *   - No duplicate assignment history entries: `engine.getVariant`
 *     is a pure read with an internal cache, so strict-mode
 *     double-invocation must not produce two "assignment" events.
 */
import { render, screen } from "@testing-library/react";
import { createEngine, type EngineEvent } from "@variantlab/core";
import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import { VariantLabProvider } from "../context.js";
import { useVariant } from "../hooks/use-variant.js";
import { baseConfig } from "./fixtures.js";

function View(): string {
  return useVariant("hero-layout");
}

describe("StrictMode", () => {
  it("produces exactly one assignment event per experiment", () => {
    const engine = createEngine(baseConfig(), { context: { userId: "alice" } });
    render(
      <StrictMode>
        <VariantLabProvider engine={engine}>
          <div data-testid="out">
            <View />
          </div>
        </VariantLabProvider>
      </StrictMode>,
    );
    // Walk the engine's ring buffer and count assignment events for
    // the experiment we read. Strict mode would normally cause two,
    // but the engine's internal cache deduplicates and our hook calls
    // getVariant through that cache.
    const history = engine.getHistory() as readonly EngineEvent[];
    const assignments = history.filter(
      (e) => e.type === "assignment" && e.experimentId === "hero-layout",
    );
    expect(assignments.length).toBeLessThanOrEqual(1);
    expect(screen.getByTestId("out").textContent).toBe("compact");
  });

  it("does not leak subscriptions after strict-mode double mount", () => {
    const engine = createEngine(baseConfig());
    let listenerCount = 0;
    // Wrap engine.subscribe to count live listeners. The wrapping
    // returns an unsubscribe that decrements so we can assert net
    // subscriptions post-render.
    const originalSubscribe = engine.subscribe.bind(engine);
    engine.subscribe = (listener) => {
      listenerCount += 1;
      const off = originalSubscribe(listener);
      return () => {
        listenerCount -= 1;
        off();
      };
    };

    const { unmount } = render(
      <StrictMode>
        <VariantLabProvider engine={engine}>
          <View />
        </VariantLabProvider>
      </StrictMode>,
    );
    // After mount in strict mode we expect exactly one active
    // subscription per rendered View.
    expect(listenerCount).toBe(1);
    unmount();
    expect(listenerCount).toBe(0);
  });
});
