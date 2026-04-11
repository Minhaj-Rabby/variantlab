/**
 * Mutex group resolution.
 *
 * When a user is eligible for multiple experiments sharing the
 * same `mutex` group, the engine deterministically picks ONE
 * winner and excludes the rest (they fall back to their default
 * variant).
 *
 * Winner selection: `hash32(userId:mutex)` mod `candidates.length`
 * against the lexicographically sorted candidate list. Same user,
 * same group, same candidates → same winner, forever.
 *
 * The engine filters candidates to *eligible* experiments (passed
 * targeting + time gates) before calling this, so mutex resolution
 * never picks a non-targeted winner.
 */
import { hash32 } from "./hash.js";

export function resolveMutex(
  userId: string,
  mutexGroup: string,
  candidateIds: readonly string[],
): string | undefined {
  if (candidateIds.length === 0) return undefined;
  const sorted = candidateIds.slice().sort();
  const bucket = hash32(`${userId}:${mutexGroup}`) % sorted.length;
  return sorted[bucket];
}
