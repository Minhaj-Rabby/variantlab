/**
 * `@variantlab/next/pages-router` — Pages Router-scoped entrypoint.
 *
 * Re-exports everything in the main barrel, plus a narrow helper that
 * reads the sticky cookie from a `NextApiRequest` / `GetServerSideProps`
 * context request object.
 */

export * from "./index.js";

import { readPayloadFromSource } from "./server/cookie.js";
import type { PagesRouterRequestLike, StickyCookiePayload } from "./types.js";
import { DEFAULT_COOKIE_NAME } from "./types.js";

/**
 * Decode the sticky payload from a Pages Router request. Accepts
 * `NextApiRequest` and the `context.req` object passed to
 * `getServerSideProps`.
 *
 *     export const getServerSideProps = (ctx) => {
 *       const payload = readPayloadFromReq(ctx.req);
 *       ...
 *     };
 */
export function readPayloadFromReq(
  req: PagesRouterRequestLike,
  name: string = DEFAULT_COOKIE_NAME,
): StickyCookiePayload | null {
  return readPayloadFromSource(req, name);
}
