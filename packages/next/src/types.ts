/**
 * Shared types for `@variantlab/next`.
 *
 * Kept in a single tiny file so every entrypoint (server barrel,
 * app-router subpath, pages-router subpath, client provider) can
 * import without pulling in code.
 */

import type { ExperimentsConfig, VariantContext } from "@variantlab/core";
import type { ReactNode } from "react";

/**
 * On-wire cookie payload shape. Short keys to minimize cookie bytes.
 *
 *   v — schema version (currently 1)
 *   u — userId (required; generated on first visit by middleware)
 *   a — assignments: { [experimentId]: variantId } (may be empty)
 */
export interface StickyCookiePayload {
  readonly v: 1;
  readonly u: string;
  readonly a: Readonly<Record<string, string>>;
}

/**
 * Anything from which we can read an HTTP Cookie header. Supports:
 *
 *   - Fetch-style `Request` (App Router Route Handlers, middleware)
 *   - `NextApiRequest` / Pages Router `req` (has `.cookies` and `.headers`)
 *   - Next 14+ `ReadonlyRequestCookies` from `cookies()` in `next/headers`
 *   - A plain cookie header string
 */
export type CookieSource =
  | Request
  | RequestCookieJar
  | PagesRouterRequestLike
  | string
  | null
  | undefined;

/**
 * Shape we rely on from Next's `cookies()` return value. Kept minimal
 * so we don't depend on `next/headers` types at compile time — the
 * server barrel must be framework-agnostic enough to tree-shake.
 */
export interface RequestCookieJar {
  get(name: string): { readonly value: string } | undefined;
}

/**
 * Minimal Pages Router / `NextApiRequest` shape. Avoids importing
 * `next` types in the base entrypoint.
 */
export interface PagesRouterRequestLike {
  readonly cookies?: Readonly<Record<string, string | undefined>>;
  readonly headers?: Readonly<Record<string, string | string[] | undefined>>;
}

/**
 * Options accepted by `createVariantLabServer` and the SSR helpers.
 */
export interface VariantLabServerOptions {
  /** Cookie name. Defaults to `__variantlab_sticky`. */
  readonly cookieName?: string;
  /** Max age in seconds. Defaults to 365 days. */
  readonly maxAge?: number;
  /** Cookie path. Defaults to `/`. */
  readonly path?: string;
  /** `SameSite` attribute. Defaults to `"lax"`. */
  readonly sameSite?: "strict" | "lax" | "none";
  /** Override for the `Secure` flag. When `undefined`, derived from the request URL. */
  readonly secure?: boolean;
  /** `HttpOnly` flag. Defaults to `true`. */
  readonly httpOnly?: boolean;
  /** `Domain` attribute. Defaults to undefined (host-only cookie). */
  readonly domain?: string;
}

/**
 * Props accepted by the Next `VariantLabProvider` Client Component.
 */
export interface VariantLabProviderProps {
  /** Validated `ExperimentsConfig` or a raw JSON module import. */
  readonly config: unknown | ExperimentsConfig;
  /** Runtime context (userId, locale, platform, …) applied before first render. */
  readonly initialContext?: VariantContext;
  /**
   * Assignments computed on the server. Seeded into the engine cache so
   * the first `getVariant` call on the client returns the same variant
   * that was server-rendered, without re-evaluating targeting.
   */
  readonly initialVariants?: Readonly<Record<string, string>>;
  readonly children?: ReactNode;
}

/** Default cookie name. Shared between server helpers and middleware. */
export const DEFAULT_COOKIE_NAME = "__variantlab_sticky";

/** Default max age (365 days, in seconds). */
export const DEFAULT_MAX_AGE = 60 * 60 * 24 * 365;
