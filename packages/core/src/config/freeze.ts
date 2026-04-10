/**
 * Recursively freeze a plain-JSON-shaped value.
 *
 * - Primitives (including `null`/`undefined`) are returned as-is.
 * - Arrays and plain objects are frozen in-place with `Object.freeze`.
 * - Already-frozen subtrees are skipped (short-circuit) so this is
 *   cheap to call on shared references and idempotent.
 *
 * Sanitized config trees are tree-shaped (no cycles, no class
 * instances) so no cycle detection is required.
 */
export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Object.isFrozen(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      deepFreeze(value[i]);
    }
    return Object.freeze(value);
  }
  // Plain object (may be null-proto after sanitize).
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    deepFreeze(obj[keys[i] as string]);
  }
  return Object.freeze(value);
}
