/**
 * `@variantlab/next/app-router` — App Router-scoped entrypoint.
 *
 * Re-exports everything in the main barrel, plus a narrow helper for
 * reading the sticky cookie from a Next `cookies()` store. Using a
 * dedicated subpath lets the App Router build a slightly smaller
 * bundle than consumers who mix routers.
 */

export * from "./index.js";

import { readPayloadFromSource } from "./server/cookie.js";
import type { StickyCookiePayload } from "./types.js";
import { DEFAULT_COOKIE_NAME } from "./types.js";

/**
 * Minimal shape of the object returned by Next's `cookies()` helper.
 * Typed locally so we don't pull `next/headers` into the type surface
 * of every importer — Next itself will provide the real types at the
 * call site.
 */
export interface AppRouterCookieStore {
  get(name: string): { readonly value: string } | undefined;
}

/**
 * Decode the sticky payload from an App Router cookie store. Accepts
 * both Next 14's synchronous `cookies()` return value and Next 15's
 * awaited `cookies()`.
 *
 *     import { cookies } from "next/headers";
 *     import { readPayloadFromCookies } from "@variantlab/next/app-router";
 *
 *     // Next 14:
 *     const payload = readPayloadFromCookies(cookies());
 *     // Next 15:
 *     const payload = readPayloadFromCookies(await cookies());
 */
export function readPayloadFromCookies(
  store: AppRouterCookieStore,
  name: string = DEFAULT_COOKIE_NAME,
): StickyCookiePayload | null {
  return readPayloadFromSource(store, name);
}
