/**
 * In-memory `Storage` implementation. Useful for tests, SSR fallbacks,
 * and any code path where the host platform's native KV is unavailable.
 *
 * The implementation is intentionally trivial: a `Map` keyed on the
 * fully-qualified key, no namespacing logic, no async wrappers. Real
 * adapters wrap a native module and may be async; this one is sync to
 * keep tests deterministic.
 */
import type { Storage } from "./types.js";

export function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem(key) {
      return map.get(key) ?? null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
    removeItem(key) {
      map.delete(key);
    },
    keys() {
      return Array.from(map.keys());
    },
    clear() {
      map.clear();
    },
  };
}
