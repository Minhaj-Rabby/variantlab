/**
 * The pluggable storage interface used by every adapter in this package.
 *
 * Mirrors the surface in `API.md` §`Storage interface` so that callers
 * can persist engine overrides to whichever native KV store fits their
 * app — AsyncStorage by default, MMKV when bundle/perf matter, or
 * SecureStore when the override list itself is sensitive.
 *
 * Methods may be sync or async to match the underlying backing store.
 * `@variantlab/core` does not yet wire this into `EngineOptions`; for
 * now adapters expose them as standalone factories so that callers can
 * implement persistence at the app boundary (e.g. by serialising
 * `engine.getHistory()` after every `variantChanged` event).
 */
export interface Storage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
  /** Optional bulk-key listing for debug overlay export and tests. */
  keys?(): string[] | Promise<string[]>;
  /** Optional clear-all helper used by `engine.resetAll()` integrations. */
  clear?(): void | Promise<void>;
}

/** Prefix every variantlab key with this so storage stays sandboxed. */
export const STORAGE_KEY_PREFIX = "variantlab:";

/** Build a fully-qualified storage key from a logical name. */
export function buildKey(name: string): string {
  return STORAGE_KEY_PREFIX + name;
}
