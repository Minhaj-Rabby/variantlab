/**
 * `getVariantSSR` / `getVariantValueSSR` — per-request SSR helpers that
 * don't require the caller to hold a `VariantLabServer` instance.
 *
 * Internally they use a `WeakMap` keyed on the raw config object identity
 * so repeat calls with the same imported JSON module don't re-validate
 * the config. The WeakMap doesn't retain anything — if the caller drops
 * the config reference, the cached server is GC'd.
 *
 * Signature matches `API.md` lines 569–582 (synchronous). See the
 * package README for notes on spec drift vs. the Session 7 prompt.
 */

import type { ExperimentsConfig, VariantContext } from "@variantlab/core";
import type { CookieSource } from "../types.js";
import {
  type CreateVariantLabServerOptions,
  createVariantLabServer,
  type VariantLabServer,
} from "./create-variant-lab-server.js";

const cache = new WeakMap<object, VariantLabServer>();

function resolveServer(
  rawConfig: unknown,
  options: CreateVariantLabServerOptions | undefined,
): VariantLabServer {
  if (rawConfig !== null && typeof rawConfig === "object") {
    const hit = cache.get(rawConfig as object);
    if (hit !== undefined) return hit;
  }
  const server = createVariantLabServer(rawConfig, options);
  if (rawConfig !== null && typeof rawConfig === "object") {
    cache.set(rawConfig as object, server);
  }
  return server;
}

/**
 * Resolve a variant for the current request. Reads the sticky cookie
 * from the supplied source (`Request`, `ReadonlyRequestCookies`,
 * `NextApiRequest`, or a raw cookie header string).
 *
 * Synchronous. In Next 15, `cookies()` is async — await it and pass the
 * resolved store into this function.
 */
export function getVariantSSR(
  experimentId: string,
  source: CookieSource,
  config: unknown | ExperimentsConfig,
  options?: CreateVariantLabServerOptions & { readonly context?: VariantContext },
): string {
  const server = resolveServer(config, options);
  return server.getVariant(experimentId, source, options?.context);
}

/** Variant-value equivalent of {@link getVariantSSR}. */
export function getVariantValueSSR<T = unknown>(
  experimentId: string,
  source: CookieSource,
  config: unknown | ExperimentsConfig,
  options?: CreateVariantLabServerOptions & { readonly context?: VariantContext },
): T {
  const server = resolveServer(config, options);
  return server.getVariantValue<T>(experimentId, source, options?.context);
}
