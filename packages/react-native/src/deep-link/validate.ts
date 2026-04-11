/**
 * Validate a candidate share payload before applying it.
 *
 * Share payloads come from untrusted input — a deep link, a QR code,
 * a clipboard paste — so we treat them as adversarial. The validator
 * walks the structure with `Object.create(null)` semantics in mind:
 *
 *   - Reject prototype-pollution keys (`__proto__`, `constructor`,
 *     `prototype`) anywhere in the tree.
 *   - Enforce strict id regexes on every override key/value so a
 *     malformed payload cannot smuggle non-printable bytes into a
 *     `setVariant` call.
 *   - Cap the override count and total decoded size to bound memory.
 *   - Honor an optional `expires` field so QR codes shared earlier
 *     in the day cannot be replayed forever.
 *
 * The validator returns a `ValidationResult` discriminated union
 * instead of throwing because callers (deep-link handler, QR scanner)
 * almost always want to silently surface a failure to the UI rather
 * than treat it as a runtime error.
 */
import type { SharePayload, ValidationFailure, ValidationResult } from "./types.js";

/** Match the same id regex as `experiments.json`. */
const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const POLLUTION_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const MAX_OVERRIDES = 100;
const MAX_PAYLOAD_BYTES = 1024;

export function validatePayload(input: unknown, now: number = Date.now()): ValidationResult {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return fail("not-an-object");
  }

  if (hasPollution(input)) return fail("prototype-pollution");

  const obj = input as Record<string, unknown>;

  if (obj.v !== 1) return fail("bad-version");

  const overrides = obj.overrides;
  if (overrides === null || typeof overrides !== "object" || Array.isArray(overrides)) {
    return fail("missing-overrides");
  }

  const overrideEntries = Object.entries(overrides as Record<string, unknown>);
  if (overrideEntries.length > MAX_OVERRIDES) return fail("overrides-too-large");

  const safeOverrides: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const [key, value] of overrideEntries) {
    if (POLLUTION_KEYS.has(key)) return fail("prototype-pollution");
    if (!ID_RE.test(key)) return fail("bad-override-key");
    if (typeof value !== "string") return fail("bad-override-value");
    if (!ID_RE.test(value)) return fail("bad-override-value");
    safeOverrides[key] = value;
  }

  let context: SharePayload["context"];
  if (obj.context !== undefined) {
    if (obj.context === null || typeof obj.context !== "object" || Array.isArray(obj.context)) {
      return fail("bad-context");
    }
    const sanitized = sanitizeContext(obj.context as Record<string, unknown>);
    if (sanitized === null) return fail("bad-context");
    context = sanitized;
  }

  let expires: number | undefined;
  if (obj.expires !== undefined) {
    if (typeof obj.expires !== "number" || !Number.isFinite(obj.expires)) {
      return fail("bad-context");
    }
    if (obj.expires < now) return fail("expired");
    expires = obj.expires;
  }

  // Re-stringify with the sanitized fields and check the encoded size.
  const reStringified = JSON.stringify({
    v: 1,
    overrides: safeOverrides,
    ...(context !== undefined ? { context } : {}),
    ...(expires !== undefined ? { expires } : {}),
  });
  if (reStringified.length > MAX_PAYLOAD_BYTES) return fail("payload-too-large");

  const payload: SharePayload = {
    v: 1,
    overrides: safeOverrides,
    ...(context !== undefined ? { context } : {}),
    ...(expires !== undefined ? { expires } : {}),
  };
  return { ok: true, payload };
}

function hasPollution(input: unknown): boolean {
  if (input === null || typeof input !== "object") return false;
  if (Array.isArray(input)) {
    for (const item of input) if (hasPollution(item)) return true;
    return false;
  }
  for (const key of Object.keys(input as object)) {
    if (POLLUTION_KEYS.has(key)) return true;
    if (hasPollution((input as Record<string, unknown>)[key])) return true;
  }
  return false;
}

function sanitizeContext(input: Record<string, unknown>): SharePayload["context"] | null {
  const out: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of Object.keys(input)) {
    if (POLLUTION_KEYS.has(key)) return null;
    const value = input[key];
    if (value === undefined) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
      continue;
    }
    if (
      key === "attributes" &&
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      const attrs: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
      for (const aKey of Object.keys(value as object)) {
        if (POLLUTION_KEYS.has(aKey)) return null;
        const aVal = (value as Record<string, unknown>)[aKey];
        if (typeof aVal === "string" || typeof aVal === "number" || typeof aVal === "boolean") {
          attrs[aKey] = aVal;
        } else {
          return null;
        }
      }
      out[key] = attrs;
      continue;
    }
    return null;
  }
  return out as SharePayload["context"];
}

function fail(reason: ValidationFailure): ValidationResult {
  return { ok: false, reason };
}
