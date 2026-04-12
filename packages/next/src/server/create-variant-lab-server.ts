/**
 * `createVariantLabServer(config, options?)` — factory that validates the
 * config once and returns request-scoped helpers. Each call to
 * `getVariant` / `getVariantValue` constructs a short-lived engine
 * seeded from the request's cookie so concurrent HTTP requests never
 * share mutable state.
 *
 * Validation is expensive; engine construction is cheap (a few Maps,
 * no I/O, no allocation beyond what's already in the frozen config).
 */

import {
  createEngine,
  type ExperimentsConfig,
  type VariantContext,
  validateConfig,
} from "@variantlab/core";
import type {
  CookieSource,
  StickyCookiePayload,
  VariantLabProviderProps,
  VariantLabServerOptions,
} from "../types.js";
import { DEFAULT_COOKIE_NAME } from "../types.js";
import {
  decodePayload,
  encodePayload,
  generateUserId,
  readPayloadFromSource,
  serializeCookie,
} from "./cookie.js";

export interface VariantLabServer {
  /** The frozen, validated config this server was built with. */
  readonly config: ExperimentsConfig;

  /**
   * Resolve a variant id using the given cookie source + optional
   * context extras. Always returns the default if anything fails.
   */
  getVariant(experimentId: string, source: CookieSource, context?: VariantContext): string;

  /**
   * Resolve a variant's `value` payload. Equivalent to calling
   * `getVariant` + looking up the variant by id.
   */
  getVariantValue<T = unknown>(
    experimentId: string,
    source: CookieSource,
    context?: VariantContext,
  ): T;

  /**
   * Decode the sticky cookie. Returns `null` when missing or invalid.
   * Layouts pass this directly to `<VariantLabProvider initialVariants={...}>`.
   */
  readPayload(source: CookieSource): StickyCookiePayload | null;

  /**
   * Build a `Set-Cookie` header value for a freshly-computed payload.
   * Caller is responsible for attaching it to the outgoing response.
   */
  writePayload(payload: StickyCookiePayload, secure?: boolean): string;

  /**
   * Build the `initialContext` + `initialVariants` props that the
   * Next `<VariantLabProvider>` needs. Convenience for layouts:
   *
   *     const props = server.toProviderProps(cookies(), { locale: "en" });
   *     return <VariantLabProvider {...props}>{children}</VariantLabProvider>;
   */
  toProviderProps(
    source: CookieSource,
    contextExtras?: VariantContext,
  ): Omit<VariantLabProviderProps, "children" | "config">;
}

export interface CreateVariantLabServerOptions extends VariantLabServerOptions {
  /**
   * Called when cookie reads or engine construction fails catastrophically.
   * Defaults to a no-op (fail-open).
   */
  readonly onError?: (error: Error) => void;
}

/**
 * Validate the supplied config once and return a factory whose methods
 * build a new `VariantEngine` per call. This is the entry point that
 * layouts, server components, route handlers, and `getServerSideProps`
 * should use when they want to resolve variants at SSR time.
 */
export function createVariantLabServer(
  rawConfig: unknown,
  options: CreateVariantLabServerOptions = {},
): VariantLabServer {
  const config = validateConfig(rawConfig);
  const cookieName = options.cookieName ?? DEFAULT_COOKIE_NAME;
  const onError = options.onError ?? (() => {});

  function readPayload(source: CookieSource): StickyCookiePayload | null {
    try {
      return readPayloadFromSource(source, cookieName);
    } catch (error) {
      onError(error as Error);
      return null;
    }
  }

  function buildContext(
    payload: StickyCookiePayload | null,
    extras: VariantContext | undefined,
  ): VariantContext {
    const userId = payload?.u ?? extras?.userId;
    if (userId === undefined) return { ...extras };
    return { ...extras, userId };
  }

  function getVariant(
    experimentId: string,
    source: CookieSource,
    context?: VariantContext,
  ): string {
    try {
      const payload = readPayload(source);
      const engine = createEngine(config, {
        context: buildContext(payload, context),
        ...(payload?.a !== undefined ? { initialAssignments: payload.a } : {}),
      });
      return engine.getVariant(experimentId);
    } catch (error) {
      onError(error as Error);
      return experimentDefault(config, experimentId);
    }
  }

  function getVariantValue<T = unknown>(
    experimentId: string,
    source: CookieSource,
    context?: VariantContext,
  ): T {
    try {
      const payload = readPayload(source);
      const engine = createEngine(config, {
        context: buildContext(payload, context),
        ...(payload?.a !== undefined ? { initialAssignments: payload.a } : {}),
      });
      return engine.getVariantValue<T>(experimentId);
    } catch (error) {
      onError(error as Error);
      return undefined as T;
    }
  }

  function writePayload(payload: StickyCookiePayload, secure?: boolean): string {
    const value = encodePayload(payload);
    return serializeCookie(cookieName, value, {
      ...options,
      ...(secure !== undefined ? { secure } : {}),
    });
  }

  function toProviderProps(
    source: CookieSource,
    contextExtras?: VariantContext,
  ): Omit<VariantLabProviderProps, "children" | "config"> {
    const payload = readPayload(source);
    const initialContext = buildContext(payload, contextExtras);
    // `payload.a` is a null-prototype object (see `decodePayload`) for
    // prototype-pollution safety during internal lookups. React Server
    // Components refuse to serialize null-prototype objects when passing
    // props across the Server→Client boundary, so we shallow-copy into a
    // plain object here. Values are strings-only per the decoder, so a
    // spread is sufficient.
    const initialVariants: Record<string, string> = payload?.a ? { ...payload.a } : {};
    return { initialContext, initialVariants };
  }

  return {
    config,
    getVariant,
    getVariantValue,
    readPayload,
    writePayload,
    toProviderProps,
  };
}

function experimentDefault(config: ExperimentsConfig, experimentId: string): string {
  const exp = config.experiments.find((e) => e.id === experimentId);
  return exp?.default ?? "";
}

/** Re-exported helpers for advanced users who only want the codecs. */
export { decodePayload, encodePayload, generateUserId };
