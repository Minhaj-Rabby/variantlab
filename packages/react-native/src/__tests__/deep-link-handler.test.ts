/**
 * Integration test for `registerDeepLinkHandler`.
 *
 * Drives a real `VariantEngine` through a mocked `Linking` module and
 * asserts that: (a) the engine receives the decoded override, (b) the
 * rate limiter drops a second apply that happens within the interval,
 * (c) unknown schemes are rejected, and (d) unsubscribing stops the
 * handler.
 */

import { createEngine } from "@variantlab/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyPayload,
  encodeSharePayload,
  type LinkingLike,
  registerDeepLinkHandler,
} from "../deep-link/index.js";
import type { SharePayload } from "../deep-link/types.js";

const config = {
  version: 1,
  experiments: [
    {
      id: "hero-card",
      name: "Hero card layout",
      default: "variant-a",
      variants: [{ id: "variant-a" }, { id: "variant-b" }],
    },
  ],
};

function makeLinking(): LinkingLike & {
  fire: (url: string) => void;
  initialUrl: string | null;
  listeners: Array<(e: { url: string }) => void>;
  removed: boolean;
} {
  const initialUrl: string | null = null;
  const listeners: Array<(e: { url: string }) => void> = [];
  return {
    initialUrl,
    listeners,
    removed: false,
    addEventListener(_type, handler) {
      listeners.push(handler);
      return {
        remove: () => {
          const i = listeners.indexOf(handler);
          if (i >= 0) listeners.splice(i, 1);
        },
      };
    },
    async getInitialURL() {
      return initialUrl;
    },
    fire(url) {
      for (const l of listeners) l({ url });
    },
  };
}

function makeUrl(payload: SharePayload): string {
  return `variantlab://apply?p=${encodeSharePayload(payload)}`;
}

describe("registerDeepLinkHandler", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("applies an override from a matching deep link", async () => {
    const engine = createEngine(config);
    const linking = makeLinking();
    const onApply = vi.fn();

    registerDeepLinkHandler(engine, linking, {
      scheme: "variantlab",
      onApply,
    });

    linking.fire(makeUrl({ v: 1, overrides: { "hero-card": "variant-b" } }));

    expect(engine.getVariant("hero-card")).toBe("variant-b");
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("rejects URLs with the wrong scheme", () => {
    const engine = createEngine(config);
    const linking = makeLinking();
    const onError = vi.fn();

    registerDeepLinkHandler(engine, linking, {
      scheme: "variantlab",
      onError,
    });

    linking.fire(
      `drishtikon://apply?p=${encodeSharePayload({
        v: 1,
        overrides: { "hero-card": "variant-b" },
      })}`,
    );

    expect(engine.getVariant("hero-card")).toBe("variant-a");
    expect(onError).toHaveBeenCalledWith("wrong-scheme");
  });

  it("rate-limits rapid applies", () => {
    const engine = createEngine(config);
    const linking = makeLinking();
    const onApply = vi.fn();

    registerDeepLinkHandler(engine, linking, {
      scheme: "variantlab",
      onApply,
      minIntervalMs: 1_000_000,
    });

    const url = makeUrl({ v: 1, overrides: { "hero-card": "variant-b" } });
    linking.fire(url);
    linking.fire(url);
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("ignores URLs without the payload param", () => {
    const engine = createEngine(config);
    const linking = makeLinking();
    const onError = vi.fn();

    registerDeepLinkHandler(engine, linking, {
      scheme: "variantlab",
      onError,
    });

    linking.fire("variantlab://apply");
    expect(onError).toHaveBeenCalledWith("no-payload");
  });

  it("unsubscribes cleanly", () => {
    const engine = createEngine(config);
    const linking = makeLinking();
    const unsubscribe = registerDeepLinkHandler(engine, linking, {
      scheme: "variantlab",
    });
    expect(linking.listeners.length).toBe(1);
    unsubscribe();
    expect(linking.listeners.length).toBe(0);
  });
});

describe("applyPayload", () => {
  it("applies overrides and updates context", () => {
    const engine = createEngine(config);
    applyPayload(engine, {
      v: 1,
      overrides: { "hero-card": "variant-b" },
      context: { platform: "ios" },
    });
    expect(engine.getVariant("hero-card")).toBe("variant-b");
    expect(engine.getContext().platform).toBe("ios");
  });
});
