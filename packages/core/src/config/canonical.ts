/**
 * Deterministic JSON serializer (RFC 8785-inspired, not strict).
 *
 * - Object keys are sorted by UTF-16 code unit (`Array#sort` default).
 * - Only own enumerable keys are serialized.
 * - `undefined` values on objects are dropped; `undefined` in arrays
 *   is emitted as `null` (matches `JSON.stringify`).
 * - Finite numbers only; `NaN`/`Infinity`/`-Infinity` throw.
 * - `BigInt`, functions, and symbols throw.
 * - No whitespace in the output.
 * - A depth cap of 512 guards against accidental unbounded recursion.
 *
 * The output is the canonical form used as input to HMAC signing
 * (Phase 2). It is **not** used for the 1 MB size check — that is
 * measured against the raw input bytes.
 */

const MAX_DEPTH = 512;

export function canonicalStringify(value: unknown): string {
  return write(value, 0);
}

function write(value: unknown, depth: number): string {
  if (depth > MAX_DEPTH) {
    throw new Error("canonical/max-depth-exceeded");
  }
  if (value === null) return "null";

  const t = typeof value;

  if (t === "string") return JSON.stringify(value);
  if (t === "boolean") return value ? "true" : "false";

  if (t === "number") {
    const n = value as number;
    if (!Number.isFinite(n)) {
      throw new Error("canonical/non-finite-number");
    }
    // JSON.stringify handles -0, integer/float formatting consistently.
    return JSON.stringify(n);
  }

  if (t === "bigint") {
    throw new Error("canonical/bigint-not-supported");
  }

  if (t === "function" || t === "symbol") {
    throw new Error("canonical/unsupported-type");
  }

  if (t === "undefined") {
    // Only reachable as a top-level call; callers handle array/object
    // contexts explicitly.
    throw new Error("canonical/undefined-at-top-level");
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    let out = "[";
    for (let i = 0; i < value.length; i++) {
      if (i > 0) out += ",";
      const item = value[i];
      out += item === undefined ? "null" : write(item, depth + 1);
    }
    return `${out}]`;
  }

  // Plain object.
  const obj = value as Record<string, unknown>;
  const ownKeys = Object.keys(obj);
  const keys: string[] = [];
  for (let ki = 0; ki < ownKeys.length; ki++) {
    const k = ownKeys[ki] as string;
    if (k === "__proto__" || k === "constructor" || k === "prototype") {
      // Defensive: sanitize should have stripped these, but never emit
      // a canonical form that could round-trip into a polluted object.
      continue;
    }
    if (obj[k] === undefined) continue;
    keys.push(k);
  }
  if (keys.length === 0) return "{}";
  keys.sort();
  let out = "{";
  for (let i = 0; i < keys.length; i++) {
    if (i > 0) out += ",";
    const k = keys[i] as string;
    out += `${JSON.stringify(k)}:${write(obj[k], depth + 1)}`;
  }
  return `${out}}`;
}
