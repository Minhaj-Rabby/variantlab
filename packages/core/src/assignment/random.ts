/**
 * "Random" assignment.
 *
 * In phase 1 MVP this is behaviorally identical to `sticky-hash`:
 * a deterministic function of `(userId, experimentId)`. The two
 * strategies exist as distinct config values because the contract
 * differs:
 *
 *   - `sticky-hash` — promised to be stable across devices for the
 *     same `userId`, zero storage needed.
 *   - `random`      — the engine is allowed to bucket the user
 *     however it likes as long as each user sees a consistent
 *     answer. Future phases may back this with storage-cached
 *     uniform-random assignments.
 *
 * The non-negotiable rule (design-principles.md §performance &
 * ARCHITECTURE.md §core invariants): **no `Math.random` in the hot
 * path**. Delegating to `assignStickyHash` keeps us honest and
 * collapses both paths to the same tree-shaken code.
 */
import type { Experiment } from "../config/types.js";
import { assignStickyHash } from "./sticky-hash.js";

export function assignRandom(experiment: Experiment, userId: string): string {
  return assignStickyHash(experiment, userId);
}
