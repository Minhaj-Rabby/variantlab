/**
 * Weighted assignment.
 *
 * Maps `(userId, experimentId)` to a `[0, 10000)` bucket via the
 * sync hash, then walks the split's cumulative boundaries in
 * sorted-key order. `split` is validated at config-load time to
 * sum to exactly 100, so we multiply by 100 internally to get an
 * integer 10000-unit range without floating point.
 *
 * Determinism: same user, same experiment, same split → same
 * variant forever. Changing the split re-buckets everyone, which
 * is the documented behavior in `config-format.md`.
 */
import type { Experiment } from "../config/types.js";
import { hash32 } from "./hash.js";

export function assignWeighted(experiment: Experiment, userId: string): string {
  const split = experiment.split;
  if (split === undefined) return experiment.default;
  const ids = Object.keys(split).sort();
  if (ids.length === 0) return experiment.default;
  const bucket = hash32(`${userId}:${experiment.id}`) % 10000;
  let cumulative = 0;
  for (const id of ids) {
    cumulative += (split[id] ?? 0) * 100;
    if (bucket < cumulative) return id;
  }
  // Unreachable when the validator enforces sum === 100.
  return experiment.default;
}
