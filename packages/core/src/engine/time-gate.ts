/**
 * Start/end date gate.
 *
 * `startDate` is inclusive, `endDate` is exclusive. Matches the
 * semantics documented in `config-format.md` §`startDate / endDate`.
 *
 * `now` is injected (not read via `Date.now()` here) so that the
 * engine can snapshot time at a single point per resolution and
 * so that tests can pin time without mocking globals. The engine
 * calls `Date.now()` once per `getVariant` call at the outer
 * boundary.
 *
 * Malformed ISO strings fail-closed (the gate returns `true` to
 * keep the experiment inactive) — a broken date is a config
 * mistake the validator catches at load time, but defending in
 * depth here is ~10 bytes we're happy to spend.
 */
import type { Experiment } from "../config/types.js";

export function isTimeGated(experiment: Experiment, now: number): boolean {
  if (experiment.startDate !== undefined) {
    const t = Date.parse(experiment.startDate);
    if (!Number.isFinite(t) || now < t) return true;
  }
  if (experiment.endDate !== undefined) {
    const t = Date.parse(experiment.endDate);
    if (!Number.isFinite(t) || now >= t) return true;
  }
  return false;
}
