/**
 * `@variantlab/next` — server barrel.
 *
 * This file is the default entrypoint when consumers write
 * `import { ... } from "@variantlab/next"`. It exposes only
 * server-safe helpers (no `"use client"`, no React). Use
 * `@variantlab/next/client` for the provider and hooks.
 *
 * Edge-runtime compatible: no Node-only APIs, no `process.env`, and
 * no runtime dependencies beyond `@variantlab/core`.
 */

export const VERSION = "0.0.0";

// Re-export core types so consumers can `import type { ExperimentsConfig }
// from "@variantlab/next"` without reaching into core directly.
export type {
  AssignmentStrategy,
  Experiment,
  ExperimentsConfig,
  Variant,
  VariantContext,
} from "@variantlab/core";
// Cookie codec + request adapters
export {
  decodePayload,
  encodePayload,
  generateUserId,
  parseCookieHeader,
  readCookieFromSource,
  readPayloadFromSource,
  serializeCookie,
} from "./server/cookie.js";
// Server-side resolution
export {
  type CreateVariantLabServerOptions,
  createVariantLabServer,
  type VariantLabServer,
} from "./server/create-variant-lab-server.js";
export { getVariantSSR, getVariantValueSSR } from "./server/get-variant-ssr.js";
// Middleware factory
export {
  type VariantLabMiddlewareOptions,
  variantLabMiddleware,
} from "./server/middleware.js";
// Types
export type {
  CookieSource,
  PagesRouterRequestLike,
  RequestCookieJar,
  StickyCookiePayload,
  VariantLabProviderProps,
  VariantLabServerOptions,
} from "./types.js";
export { DEFAULT_COOKIE_NAME, DEFAULT_MAX_AGE } from "./types.js";
