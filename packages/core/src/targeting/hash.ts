/**
 * Web Crypto SHA-256 bucket hash for the `userId` hash-mod operator.
 * Returns an integer in [0, 99].
 *
 * The engine (Session 4) precomputes this on every `updateContext` and
 * stashes the result as `userIdBucket` in the eval context. The
 * operator reads it synchronously — `evaluate()` itself never awaits
 * anything.
 *
 * `globalThis.crypto.subtle` and `TextEncoder` are standardized in
 * Node 18.17+, browsers, Deno, Bun, and Edge runtimes. They are the
 * only platform globals `@variantlab/core` uses.
 */

interface CryptoLike {
  readonly subtle: {
    digest(algorithm: string, data: Uint8Array): Promise<ArrayBuffer>;
  };
}

declare class TextEncoder {
  encode(input?: string): Uint8Array;
}

const encoder = new TextEncoder();

export async function hashUserId(userId: string): Promise<number> {
  const bytes = encoder.encode(userId);
  const g = globalThis as unknown as { readonly crypto: CryptoLike };
  const buf = await g.crypto.subtle.digest("SHA-256", bytes);
  const view = new DataView(buf);
  const uint32 = view.getUint32(0, false); // big-endian
  return uint32 % 100;
}
