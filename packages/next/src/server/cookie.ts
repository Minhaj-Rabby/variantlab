/**
 * Hand-rolled cookie codec + parser for `@variantlab/next`.
 *
 * Goals:
 *   1. Zero runtime dependencies. No `cookie` package, no `js-base64`.
 *   2. Edge-runtime safe. Uses only `TextEncoder`/`TextDecoder`,
 *      `globalThis.crypto`, standard `atob`/`btoa`, and `Object.create(null)`
 *      — all available on Vercel Edge, Cloudflare Workers, Deno, Bun, Node 18+.
 *   3. Prototype-pollution hardened. Mirrors the guards in
 *      `packages/core/src/config/validator.ts`: cookie parser rejects
 *      `__proto__`, `constructor`, `prototype` as cookie names, and the
 *      JSON payload is parsed through `Object.create(null)` sanitization.
 *   4. Size-capped. A malicious client sending a 10 MB Cookie header gets
 *      rejected before allocation by `MAX_COOKIE_HEADER_BYTES`.
 */

import type {
  CookieSource,
  PagesRouterRequestLike,
  RequestCookieJar,
  StickyCookiePayload,
  VariantLabServerOptions,
} from "../types.js";
import { DEFAULT_COOKIE_NAME, DEFAULT_MAX_AGE } from "../types.js";

/** Hard cap on cookie header length (4 KB × 2 for long headers). */
const MAX_COOKIE_HEADER_BYTES = 8192;
/** Hard cap on a single decoded payload. */
const MAX_PAYLOAD_BYTES = 4096;
/** Cookie names that are never read (prototype-pollution guard). */
const RESERVED_NAMES = new Set(["__proto__", "constructor", "prototype"]);

// ---------------------------------------------------------------------------
// base64url codec (hand-rolled, 16 LOC)
// ---------------------------------------------------------------------------

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function base64urlEncode(input: string): string {
  const bytes = textEncoder.encode(input);
  // `btoa` takes a latin-1 string, so map bytes → chars first.
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] as number);
  }
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(input: string): string | null {
  // Reject anything that isn't legal base64url up front.
  if (!/^[A-Za-z0-9\-_]*$/.test(input)) return null;
  const pad = input.length % 4;
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "====".slice(pad === 0 ? 4 : pad);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return textDecoder.decode(bytes);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Payload encode / decode
// ---------------------------------------------------------------------------

/**
 * Encode a `StickyCookiePayload` to its on-wire value. Does NOT include
 * the cookie name or attributes — see {@link serializeCookie}.
 */
export function encodePayload(payload: StickyCookiePayload): string {
  const json = JSON.stringify({ v: payload.v, u: payload.u, a: payload.a });
  return base64urlEncode(json);
}

/**
 * Decode a base64url-encoded cookie value back to a `StickyCookiePayload`.
 * Returns `null` for anything that fails validation. Never throws.
 */
export function decodePayload(raw: string | undefined | null): StickyCookiePayload | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  if (raw.length > MAX_PAYLOAD_BYTES) return null;
  const json = base64urlDecode(raw);
  if (json === null) return null;
  if (json.length > MAX_PAYLOAD_BYTES) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const obj = parsed as Record<string, unknown>;
  if (obj["v"] !== 1) return null;
  if (typeof obj["u"] !== "string" || obj["u"].length === 0 || obj["u"].length > 256) return null;
  const rawA = obj["a"];
  if (rawA === null || typeof rawA !== "object" || Array.isArray(rawA)) return null;
  const src = rawA as Record<string, unknown>;
  const a: Record<string, string> = Object.create(null);
  for (const key of Object.keys(src)) {
    if (RESERVED_NAMES.has(key)) continue;
    if (key.length === 0 || key.length > 128) continue;
    const val = src[key];
    if (typeof val !== "string" || val.length === 0 || val.length > 128) continue;
    a[key] = val;
  }
  return { v: 1, u: obj["u"] as string, a };
}

// ---------------------------------------------------------------------------
// Cookie header parsing (hand-rolled tokenizer)
// ---------------------------------------------------------------------------

/**
 * Parse a raw `Cookie:` header into a `null`-prototype map of
 * `name → value`. Tolerates leading whitespace, empty segments,
 * missing `=`, and rejects reserved names.
 */
export function parseCookieHeader(header: string | undefined | null): Record<string, string> {
  const out: Record<string, string> = Object.create(null);
  if (typeof header !== "string" || header.length === 0) return out;
  if (header.length > MAX_COOKIE_HEADER_BYTES) return out;

  let i = 0;
  const n = header.length;
  while (i < n) {
    // Skip leading whitespace in this segment.
    while (i < n && (header.charCodeAt(i) === 0x20 || header.charCodeAt(i) === 0x09)) i++;
    const start = i;
    while (i < n && header.charCodeAt(i) !== 0x3b /* ; */) i++;
    const segment = header.slice(start, i);
    if (i < n) i++; // consume `;`
    if (segment.length === 0) continue;
    const eq = segment.indexOf("=");
    if (eq <= 0) continue;
    const name = segment.slice(0, eq).trim();
    if (name.length === 0) continue;
    if (RESERVED_NAMES.has(name)) continue;
    let value = segment.slice(eq + 1).trim();
    // Cookies sometimes come wrapped in double quotes.
    if (
      value.length >= 2 &&
      value.charCodeAt(0) === 0x22 &&
      value.charCodeAt(value.length - 1) === 0x22
    ) {
      value = value.slice(1, -1);
    }
    // Keep first occurrence of a duplicate name.
    if (out[name] === undefined) {
      out[name] = safeDecodeURIComponent(value);
    }
  }
  return out;
}

function safeDecodeURIComponent(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

// ---------------------------------------------------------------------------
// Cookie serialization (Set-Cookie value builder)
// ---------------------------------------------------------------------------

/**
 * Build a `Set-Cookie` header value: `name=value; attr=...; ...`.
 * Cookie value is URL-encoded so any non-ASCII bytes round-trip through
 * a standards-compliant parser.
 */
export function serializeCookie(
  name: string,
  value: string,
  options: VariantLabServerOptions & { readonly secure?: boolean } = {},
): string {
  const parts: string[] = [`${name}=${encodeURIComponent(value)}`];
  const maxAge = options.maxAge ?? DEFAULT_MAX_AGE;
  if (maxAge > 0) parts.push(`Max-Age=${Math.floor(maxAge)}`);
  parts.push(`Path=${options.path ?? "/"}`);
  const sameSite = options.sameSite ?? "lax";
  parts.push(`SameSite=${capitalize(sameSite)}`);
  if (options.httpOnly !== false) parts.push("HttpOnly");
  if (options.secure === true) parts.push("Secure");
  if (options.domain !== undefined) parts.push(`Domain=${options.domain}`);
  return parts.join("; ");
}

function capitalize(s: string): string {
  if (s.length === 0) return s;
  return s[0]!.toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Request-source adapters
// ---------------------------------------------------------------------------

/**
 * Read a named cookie from any supported source: `Request`, Next's
 * `ReadonlyRequestCookies`, a Pages Router `NextApiRequest`, or a
 * raw header string. Returns `undefined` when missing.
 */
export function readCookieFromSource(
  source: CookieSource,
  name: string = DEFAULT_COOKIE_NAME,
): string | undefined {
  if (source === null || source === undefined) return undefined;

  if (typeof source === "string") {
    const parsed = parseCookieHeader(source);
    return parsed[name];
  }

  // `ReadonlyRequestCookies` shape.
  if (typeof (source as RequestCookieJar).get === "function") {
    const entry = (source as RequestCookieJar).get(name);
    return entry === undefined ? undefined : entry.value;
  }

  // Fetch `Request`.
  if (typeof (source as Request).headers?.get === "function") {
    const header = (source as Request).headers.get("cookie");
    if (header === null) return undefined;
    return parseCookieHeader(header)[name];
  }

  // Pages Router `req` shape.
  const pagesReq = source as PagesRouterRequestLike;
  if (pagesReq.cookies !== undefined) {
    const fromBag = pagesReq.cookies[name];
    if (typeof fromBag === "string" && fromBag.length > 0) return fromBag;
  }
  if (pagesReq.headers !== undefined) {
    const header = pagesReq.headers["cookie"];
    if (typeof header === "string") return parseCookieHeader(header)[name];
    if (Array.isArray(header) && typeof header[0] === "string") {
      return parseCookieHeader(header[0])[name];
    }
  }
  return undefined;
}

/**
 * Full helper: read the sticky payload from a source, returning
 * `null` if the cookie is missing, malformed, or fails validation.
 */
export function readPayloadFromSource(
  source: CookieSource,
  name: string = DEFAULT_COOKIE_NAME,
): StickyCookiePayload | null {
  const raw = readCookieFromSource(source, name);
  return decodePayload(raw);
}

// ---------------------------------------------------------------------------
// User ID generation (Web Crypto — available on every target runtime)
// ---------------------------------------------------------------------------

/**
 * Generate a v4 UUID via `crypto.randomUUID`, falling back to a
 * hand-formatted v4 built from `crypto.getRandomValues`. Both APIs
 * are Web Crypto and are available on every Phase 1 target runtime.
 */
export function generateUserId(): string {
  const g = globalThis as {
    crypto?: {
      randomUUID?: () => string;
      getRandomValues?: <T extends ArrayBufferView>(arr: T) => T;
    };
  };
  if (g.crypto?.randomUUID !== undefined) return g.crypto.randomUUID();
  if (g.crypto?.getRandomValues !== undefined) {
    const bytes = new Uint8Array(16);
    g.crypto.getRandomValues(bytes);
    // Set version (4) and variant (10xx) bits.
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex: string[] = [];
    for (let i = 0; i < 16; i++) {
      hex.push((bytes[i] as number).toString(16).padStart(2, "0"));
    }
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
  }
  // Last-ditch fallback: timestamp + Math.random. Not cryptographically
  // strong, but deterministic per-visit user IDs are not a security boundary.
  return `u-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

/** Exported so adapters can override the default name. */
export { DEFAULT_COOKIE_NAME, DEFAULT_MAX_AGE } from "../types.js";
