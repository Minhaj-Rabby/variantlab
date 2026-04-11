/**
 * Kill-switch logic.
 *
 * Returns `true` when an experiment should short-circuit to its
 * default variant for a reason that isn't context-specific:
 *
 *   - Global `config.enabled === false` — admin kill switch for
 *     fast incident response.
 *   - `status === "archived"` — the experiment is over, keep the
 *     config around for history but never evaluate it.
 *   - `status === "draft"` — the experiment is being authored; in
 *     production this behaves the same as archived (returns the
 *     default), the debug overlay shows it with a badge so devs
 *     can still preview it.
 */
import type { Experiment, ExperimentsConfig } from "../config/types.js";

export function isKilled(config: ExperimentsConfig, experiment: Experiment): boolean {
  if (config.enabled === false) return true;
  if (experiment.status === "archived") return true;
  if (experiment.status === "draft") return true;
  return false;
}
