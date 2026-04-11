/**
 * Tests for the four `Storage` adapters.
 *
 * We exercise the real code against in-test mocks that implement
 * each native module's interface. This gives us confidence that
 * the adapter plumbing is correct without ever booting up the
 * actual native modules.
 */
import { describe, expect, it } from "vitest";
import { type AsyncStorageLike, createAsyncStorageAdapter } from "../storage/async-storage.js";
import { createMemoryStorage } from "../storage/memory.js";
import { createMMKVStorageAdapter, type MMKVLike } from "../storage/mmkv.js";
import { createSecureStoreAdapter, type SecureStoreLike } from "../storage/secure-store.js";
import { buildKey, STORAGE_KEY_PREFIX } from "../storage/types.js";

describe("buildKey", () => {
  it("prefixes with the variantlab namespace", () => {
    expect(buildKey("foo")).toBe(`${STORAGE_KEY_PREFIX}foo`);
    expect(STORAGE_KEY_PREFIX).toBe("variantlab:");
  });
});

describe("createMemoryStorage", () => {
  it("round-trips set/get/remove", async () => {
    const storage = createMemoryStorage();
    expect(await storage.getItem("a")).toBeNull();
    await storage.setItem("a", "1");
    expect(await storage.getItem("a")).toBe("1");
    await storage.removeItem("a");
    expect(await storage.getItem("a")).toBeNull();
  });

  it("lists keys and clears", async () => {
    const storage = createMemoryStorage();
    await storage.setItem("a", "1");
    await storage.setItem("b", "2");
    expect(await storage.keys?.()).toEqual(["a", "b"]);
    await storage.clear?.();
    expect(await storage.keys?.()).toEqual([]);
  });
});

describe("createAsyncStorageAdapter", () => {
  const makeMock = (): AsyncStorageLike & {
    map: Map<string, string>;
    calls: string[];
  } => {
    const map = new Map<string, string>();
    const calls: string[] = [];
    return {
      map,
      calls,
      async getItem(key) {
        calls.push(`getItem:${key}`);
        return map.get(key) ?? null;
      },
      async setItem(key, value) {
        calls.push(`setItem:${key}`);
        map.set(key, value);
      },
      async removeItem(key) {
        calls.push(`removeItem:${key}`);
        map.delete(key);
      },
      async getAllKeys() {
        calls.push(`getAllKeys`);
        return Array.from(map.keys());
      },
      async clear() {
        calls.push(`clear`);
        map.clear();
      },
    };
  };

  it("round-trips through the injected module", async () => {
    const mock = makeMock();
    const storage = createAsyncStorageAdapter(mock);
    await storage.setItem("k", "v");
    expect(await storage.getItem("k")).toBe("v");
    expect(await storage.keys?.()).toEqual(["k"]);
    await storage.removeItem("k");
    expect(await storage.getItem("k")).toBeNull();
    await storage.clear?.();
    expect(mock.calls).toContain("clear");
  });

  it("tolerates a module without clear()", async () => {
    const mock = makeMock();
    const { clear: _omit, ...partial } = mock;
    const storage = createAsyncStorageAdapter(partial as AsyncStorageLike);
    await expect(storage.clear?.()).resolves.toBeUndefined();
  });
});

describe("createMMKVStorageAdapter", () => {
  const makeMock = (): MMKVLike => {
    const map = new Map<string, string>();
    return {
      set: (key, value) => {
        map.set(key, String(value));
      },
      getString: (key) => map.get(key),
      contains: (key) => map.has(key),
      delete: (key) => {
        map.delete(key);
      },
      getAllKeys: () => Array.from(map.keys()),
      clearAll: () => map.clear(),
    };
  };

  it("converts undefined to null on miss", () => {
    const storage = createMMKVStorageAdapter(makeMock());
    expect(storage.getItem("miss")).toBeNull();
  });

  it("round-trips and clears", () => {
    const storage = createMMKVStorageAdapter(makeMock());
    storage.setItem("a", "1");
    expect(storage.getItem("a")).toBe("1");
    expect(storage.keys?.()).toEqual(["a"]);
    storage.removeItem("a");
    expect(storage.getItem("a")).toBeNull();
    storage.setItem("b", "2");
    storage.clear?.();
    expect(storage.keys?.()).toEqual([]);
  });
});

describe("createSecureStoreAdapter", () => {
  const makeMock = (): SecureStoreLike & { log: string[] } => {
    const map = new Map<string, string>();
    const log: string[] = [];
    return {
      log,
      async getItemAsync(key) {
        log.push(`get:${key}`);
        return map.get(key) ?? null;
      },
      async setItemAsync(key, value) {
        log.push(`set:${key}`);
        map.set(key, value);
      },
      async deleteItemAsync(key) {
        log.push(`del:${key}`);
        map.delete(key);
      },
    };
  };

  it("round-trips non-safe keys via underscore encoding", async () => {
    const mock = makeMock();
    const storage = createSecureStoreAdapter(mock);
    await storage.setItem("variantlab:overrides", "{}");
    expect(await storage.getItem("variantlab:overrides")).toBe("{}");
    // `:` (0x3a) is encoded as `_3a_`.
    expect(mock.log[0]).toContain("_3a_");
    await storage.removeItem("variantlab:overrides");
    expect(await storage.getItem("variantlab:overrides")).toBeNull();
  });

  it("passes through alnum keys untouched", async () => {
    const mock = makeMock();
    const storage = createSecureStoreAdapter(mock);
    await storage.setItem("plainKey-1.2_3", "x");
    expect(mock.log[0]).toBe("set:plainKey-1.2_3");
  });
});
