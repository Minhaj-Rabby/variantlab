/**
 * Sticky-hash assignment.
 *
 * Deterministic from `(userId, experimentId)`: hash the pair with
 * the sync 32-bit hash and map the result modulo the sorted variant
 * count. Sort order is lexicographic on `variant.id` so that the
 * mapping is stable across processes, devices, and restarts.
 *
 * Adding a new variant renumbers existing users (the classic
 * hash-mod trade-off). This is acceptable for phase 1 — the
 * config-format doc calls out that variant additions are effectively
 * a new experiment. Rendezvous hashing would fix this but costs
 * ~300 bytes we don't want to spend before someone asks for it.
 */
import type { Experiment } from "../config/types.js";
import { hash32 } from "./hash.js";

export function assignStickyHash(experiment: Experiment, userId: string): string {
  const ids = experiment.variants.map((v) => v.id).sort();
  const bucket = hash32(`${userId}:${experiment.id}`) % ids.length;
  return ids[bucket] ?? experiment.default;
}
