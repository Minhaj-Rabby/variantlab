/**
 * `Storage` adapter backed by `@react-native-async-storage/async-storage`.
 *
 * AsyncStorage is the de-facto standard KV store on React Native and
 * the only one we recommend by default — it's bundled with every
 * Expo project, ships in the New Architecture, and works on iOS,
 * Android, web, and tvOS. It is, however, async on every method, so
 * the returned `Storage` is a fully async implementation.
 *
 * The adapter is constructed lazily: callers pass in their AsyncStorage
 * module rather than us importing it. This keeps `@variantlab/react-native`
 * itself free of any RN package imports at module load — the user's
 * bundler resolves the peer, we never see it. The factory accepts the
 * module directly so the surface is dependency-injected and trivially
 * testable.
 */
import type { Storage } from "./types.js";

/** Subset of `AsyncStorageStatic` we actually use. */
export interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  clear?(): Promise<void>;
}

export function createAsyncStorageAdapter(asyncStorage: AsyncStorageLike): Storage {
  return {
    async getItem(key) {
      return asyncStorage.getItem(key);
    },
    async setItem(key, value) {
      await asyncStorage.setItem(key, value);
    },
    async removeItem(key) {
      await asyncStorage.removeItem(key);
    },
    async keys() {
      const all = await asyncStorage.getAllKeys();
      return Array.from(all);
    },
    async clear() {
      if (typeof asyncStorage.clear === "function") {
        await asyncStorage.clear();
      }
    },
  };
}
