/**
 * Synchronous 32-bit string hash for deterministic assignment.
 *
 * `getVariant` is required to be synchronous and O(1) (see
 * `ARCHITECTURE.md` runtime data flow and the design principle
 * of cheap, render-safe reads). Web Crypto's `subtle.digest` is
 * always async, so we hand-roll a tiny hash here:
 *
 *   - FNV-1a (32-bit) core for fast streaming.
 *   - Murmur3 finalizer for avalanche (uniform bit distribution).
 *
 * Total: ~150 bytes gzipped. Deterministic across every runtime we
 * target (Node 18+, browsers, RN, Deno, Bun, Edge) because every
 * step is a 32-bit integer operation with defined overflow semantics
 * via `Math.imul` and `>>> 0`.
 *
 * This is **not** cryptographic — do not use for signing. The async
 * sha256 path in `../targeting/hash.ts` remains available for
 * advanced use cases. The phase-0 "which hash algorithm" open
 * question in `docs/phases/phase-0-foundation.md` resolves here.
 */

/** FNV-1a 32-bit hash + Murmur3 finalizer. Returns a uint32. */
export function hash32(input: string): number {
  let h = 2166136261; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619); // FNV prime
  }
  // Murmur3 fmix32 avalanche
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Map a userId to a [0, 100) bucket. Used by user-id hash-mod targeting. */
export function bucketUserId(userId: string): number {
  return hash32(userId) % 100;
}
