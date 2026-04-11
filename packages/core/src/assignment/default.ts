/**
 * Default assignment: always returns the experiment's `default`
 * variant. Used when no strategy is configured, when the user is
 * not yet bucketable (no `userId`), or as the fallback in
 * fail-open error paths.
 */
import type { Experiment } from "../config/types.js";

export function assignDefault(experiment: Experiment): string {
  return experiment.default;
}
