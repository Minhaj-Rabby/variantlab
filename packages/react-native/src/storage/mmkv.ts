/**
 * `Storage` adapter backed by `react-native-mmkv`.
 *
 * MMKV is a fully synchronous KV store implemented in C++ on top of
 * mmap. It's the fastest option on RN by a wide margin and is
 * particularly nice for variantlab because variant resolution is
 * synchronous on the hot path — using MMKV means storage round trips
 * never block on a JS-bridge call.
 *
 * Like `async-storage`, the underlying instance is dependency-injected
 * rather than imported here. The caller constructs an `MMKV` instance
 * (typically with their own `id` namespace and optional encryption key)
 * and hands it in. We only require a tiny subset of the surface so
 * users can also pass any compatible mock in tests.
 */
import type { Storage } from "./types.js";

/** Subset of the real MMKV instance we depend on. */
export interface MMKVLike {
  set(key: string, value: string): void;
  getString(key: string): string | undefined;
  contains(key: string): boolean;
  delete(key: string): void;
  getAllKeys(): string[];
  clearAll?(): void;
}

export function createMMKVStorageAdapter(mmkv: MMKVLike): Storage {
  return {
    getItem(key) {
      const value = mmkv.getString(key);
      return value === undefined ? null : value;
    },
    setItem(key, value) {
      mmkv.set(key, value);
    },
    removeItem(key) {
      mmkv.delete(key);
    },
    keys() {
      return mmkv.getAllKeys();
    },
    clear() {
      if (typeof mmkv.clearAll === "function") {
        mmkv.clearAll();
      }
    },
  };
}
