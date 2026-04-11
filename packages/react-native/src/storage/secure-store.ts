/**
 * `Storage` adapter backed by `expo-secure-store`.
 *
 * SecureStore writes through to Keychain (iOS) and the EncryptedSharedPreferences
 * /Keystore pair (Android). It's appropriate when the override payload
 * is itself sensitive — e.g. an experiment that toggles an internal
 * staging endpoint, an enterprise feature flag, or a beta-channel key.
 *
 * SecureStore has two notable constraints:
 *
 *   1. **No bulk key listing.** The native API does not expose a
 *      "list every key" operation, so `keys()` is intentionally absent.
 *      Callers that need bulk operations should layer an index in a
 *      separate AsyncStorage entry, or compose with `createMemoryStorage`.
 *   2. **Slow on Android.** Each read/write hits the native module.
 *      Don't use this on hot paths where latency matters.
 *
 * As with the other adapters, the upstream module is injected so this
 * file imports nothing from `expo-secure-store` itself.
 */
import type { Storage } from "./types.js";

/** Subset of the real `expo-secure-store` namespace we use. */
export interface SecureStoreLike {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export function createSecureStoreAdapter(secureStore: SecureStoreLike): Storage {
  return {
    async getItem(key) {
      // SecureStore keys must be alphanumeric / `_` / `-` / `.` only;
      // we transparently base64-encode anything else so callers can
      // use the colon-prefixed `variantlab:` namespace.
      return secureStore.getItemAsync(safeKey(key));
    },
    async setItem(key, value) {
      await secureStore.setItemAsync(safeKey(key), value);
    },
    async removeItem(key) {
      await secureStore.deleteItemAsync(safeKey(key));
    },
  };
}

function safeKey(key: string): string {
  // SecureStore allows /^[A-Za-z0-9._-]+$/. Substitute disallowed
  // characters with a deterministic underscore-encoded form so the
  // round trip is stable and reversible.
  let out = "";
  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i);
    const isAlnum =
      (c >= 48 && c <= 57) || // 0-9
      (c >= 65 && c <= 90) || // A-Z
      (c >= 97 && c <= 122); // a-z
    if (isAlnum || c === 46 || c === 95 || c === 45) {
      out += key[i];
    } else {
      // Encode the codepoint as `_<hex>_`.
      out += `_${c.toString(16)}_`;
    }
  }
  return out;
}
