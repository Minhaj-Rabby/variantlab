/**
 * `variantLabMiddleware(config, options?)` — Next.js middleware factory.
 *
 * Responsibilities (Phase 1):
 *   1. Read the sticky cookie from the incoming request.
 *   2. If missing or malformed, mint a fresh userId and write an
 *      empty payload `{ v: 1, u: userId, a: {} }` on the outgoing
 *      response. Assignments are NOT computed at the edge.
 *   3. Fail-open: any error → pass through unmodified.
 *
 * The factory takes the raw config only so it can validate it once at
 * import time — middleware is instantiated per process, not per request.
 * It does not resolve any experiments during middleware execution.
 *
 * Designed to run on the Vercel Edge runtime (`export const runtime = "edge"`).
 * No Node-only APIs. No `process.env` access.
 */

import { validateConfig } from "@variantlab/core";
import type { StickyCookiePayload, VariantLabServerOptions } from "../types.js";
import { DEFAULT_COOKIE_NAME } from "../types.js";
import {
  decodePayload,
  encodePayload,
  generateUserId,
  parseCookieHeader,
  serializeCookie,
} from "./cookie.js";

/**
 * The minimal shape we need from `NextRequest`. Avoids a hard
 * dependency on `next/server` at type-check time.
 */
interface NextRequestLike {
  readonly headers: { get(name: string): string | null };
  readonly nextUrl: { readonly protocol: string };
}

/**
 * The minimal shape we produce / consume for `NextResponse`. Matches
 * `NextResponse.next()` / `NextResponse.redirect()` return values.
 */
interface NextResponseLike {
  readonly headers: { append(name: string, value: string): void };
}

export interface VariantLabMiddlewareOptions extends VariantLabServerOptions {
  /**
   * Called on any caught error. Defaults to a no-op so the middleware
   * remains fail-open. Provide a logger here if you want visibility.
   */
  readonly onError?: (error: Error) => void;
}

/**
 * Build a middleware function. Accepts the raw response factory from
 * the caller so we don't need to import `NextResponse` directly (that
 * would drag `next/server` into every consumer's bundle).
 *
 * Typical usage in `middleware.ts`:
 *
 *     import { NextResponse } from "next/server";
 *     import experiments from "./experiments.json";
 *     import { variantLabMiddleware } from "@variantlab/next";
 *
 *     const middleware = variantLabMiddleware(experiments);
 *
 *     export default function (req) {
 *       return middleware(req, NextResponse.next());
 *     }
 *
 * The factory also exports `middleware.handle(req, nextResponseFactory)`
 * for the more idiomatic style where NextResponse is only imported once.
 */
export function variantLabMiddleware(
  rawConfig: unknown,
  options: VariantLabMiddlewareOptions = {},
) {
  // Validate once at import time so schema errors surface at build time,
  // not on the first request. The validated value is unused by the
  // per-request path, but we keep it captured to hold a strong reference.
  let frozen = true;
  try {
    validateConfig(rawConfig);
  } catch (error) {
    options.onError?.(error as Error);
    frozen = false;
  }

  const cookieName = options.cookieName ?? DEFAULT_COOKIE_NAME;
  const onError = options.onError ?? (() => {});

  return function apply<TResponse extends NextResponseLike>(
    req: NextRequestLike,
    response: TResponse,
  ): TResponse {
    if (!frozen) return response;
    try {
      const header = req.headers.get("cookie");
      const cookies = parseCookieHeader(header ?? "");
      const existing = decodePayload(cookies[cookieName]);
      if (existing !== null) return response;

      const payload: StickyCookiePayload = {
        v: 1,
        u: generateUserId(),
        a: {},
      };
      const secure = req.nextUrl.protocol === "https:";
      const setCookie = serializeCookie(cookieName, encodePayload(payload), {
        ...options,
        secure,
      });
      response.headers.append("set-cookie", setCookie);
      return response;
    } catch (error) {
      onError(error as Error);
      return response;
    }
  };
}
