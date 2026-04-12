/**
 * Pure helpers for the overlay's experiment filtering pipeline.
 *
 * The overlay applies three independent filters to the engine's
 * experiment list:
 *
 *   1. Route filter — only show experiments whose `routes` glob
 *      matches the current path. Provided by core via
 *      `engine.getExperiments(route)`, but the overlay also needs to
 *      strip archived experiments which core does not.
 *   2. "Hidden when archived" — `status: "archived"` experiments
 *      should never appear in the picker. They live in core for
 *      historical inspection.
 *   3. Search query — case-insensitive substring match across the
 *      id, name, and any variant id/label.
 *
 * Splitting these out into a pure module makes them trivial to unit
 * test without spinning up a renderer.
 */
import type { Experiment } from "@variantlab/core";

export function isVisibleExperiment(experiment: Experiment): boolean {
  return experiment.status !== "archived";
}

export function matchesSearch(experiment: Experiment, query: string): boolean {
  if (query === "") return true;
  const needle = query.toLowerCase();
  if (experiment.id.toLowerCase().includes(needle)) return true;
  if (experiment.name.toLowerCase().includes(needle)) return true;
  for (const v of experiment.variants) {
    if (v.id.toLowerCase().includes(needle)) return true;
    if (v.label?.toLowerCase().includes(needle)) return true;
  }
  return false;
}

export function filterExperiments(
  list: readonly Experiment[],
  query: string,
): readonly Experiment[] {
  const out: Experiment[] = [];
  for (const exp of list) {
    if (!isVisibleExperiment(exp)) continue;
    if (!matchesSearch(exp, query)) continue;
    out.push(exp);
  }
  return out;
}
