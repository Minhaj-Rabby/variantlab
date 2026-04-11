/**
 * Assignment barrel.
 *
 * `assignVariant` is the single entry point used by the engine hot
 * path. It dispatches on `experiment.assignment` and falls back to
 * the default variant whenever the user isn't bucketable (missing
 * `userId`) — every non-`default` strategy depends on a stable
 * identity to be deterministic.
 */
import type { Experiment } from "../config/types.js";
import { assignDefault } from "./default.js";
import { assignRandom } from "./random.js";
import { assignStickyHash } from "./sticky-hash.js";
import { assignWeighted } from "./weighted.js";

export { assignDefault } from "./default.js";
export { bucketUserId, hash32 } from "./hash.js";
export { resolveMutex } from "./mutex.js";
export { assignRandom } from "./random.js";
export { assignStickyHash } from "./sticky-hash.js";
export { assignWeighted } from "./weighted.js";

export function assignVariant(experiment: Experiment, userId: string | undefined): string {
  const strategy = experiment.assignment ?? "default";
  if (strategy === "default") return assignDefault(experiment);
  if (userId === undefined || userId === "") return assignDefault(experiment);
  if (strategy === "random") return assignRandom(experiment, userId);
  if (strategy === "sticky-hash") return assignStickyHash(experiment, userId);
  if (strategy === "weighted") return assignWeighted(experiment, userId);
  return assignDefault(experiment);
}
