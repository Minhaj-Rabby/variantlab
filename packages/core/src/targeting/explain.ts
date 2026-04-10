/**
 * Trace-producing evaluator. Walks startDate → endDate → targeting
 * (in the evaluator order), records every check performed, and
 * short-circuits at the first failure. The returned `steps` array
 * includes every check actually performed, ending with the failing
 * one when there is one.
 */

import { matchAppVersion } from "./operators/app-version.js";
import { matchAttributes } from "./operators/attributes.js";
import { matchLocale } from "./operators/locale.js";
import { matchPlatform } from "./operators/platform.js";
import { matchRoutes } from "./operators/routes.js";
import { matchScreenSize } from "./operators/screen-size.js";
import { matchUserId } from "./operators/user-id.js";
import type {
  EvalContext,
  EvaluableTargeting,
  Experiment,
  ExplainField,
  ExplainResult,
  ExplainStep,
  VariantContext,
} from "./types.js";

export function explain(
  experiment: Experiment,
  context: VariantContext | EvalContext,
): ExplainResult {
  const steps: ExplainStep[] = [];
  const record = (field: ExplainField, ok: boolean, detail: string): ExplainResult | null => {
    steps.push(ok ? { field, matched: true } : { field, matched: false, detail });
    return ok ? null : { matched: false, reason: field, steps };
  };

  if (experiment.startDate !== undefined) {
    const t = Date.parse(experiment.startDate);
    const r = record(
      "startDate",
      Number.isFinite(t) && Date.now() >= t,
      `now<${experiment.startDate}`,
    );
    if (r) return r;
  }
  if (experiment.endDate !== undefined) {
    const t = Date.parse(experiment.endDate);
    const r = record("endDate", Number.isFinite(t) && Date.now() < t, `now>=${experiment.endDate}`);
    if (r) return r;
  }

  const tg = experiment.targeting as EvaluableTargeting | undefined;
  if (tg === undefined) return { matched: true, steps };
  const ctx = context as EvalContext;

  if (tg.platform !== undefined) {
    const r = record(
      "platform",
      matchPlatform(tg.platform, ctx.platform),
      `${ctx.platform} vs ${tg.platform}`,
    );
    if (r) return r;
  }
  if (tg.screenSize !== undefined) {
    const r = record(
      "screenSize",
      matchScreenSize(tg.screenSize, ctx.screenSize),
      `${ctx.screenSize} vs ${tg.screenSize}`,
    );
    if (r) return r;
  }
  if (tg.locale !== undefined) {
    const r = record("locale", matchLocale(tg.locale, ctx.locale), `${ctx.locale} vs ${tg.locale}`);
    if (r) return r;
  }
  if (tg.appVersion !== undefined) {
    const r = record(
      "appVersion",
      matchAppVersion(tg.appVersion, ctx.appVersion),
      `${ctx.appVersion} vs ${tg.appVersion}`,
    );
    if (r) return r;
  }
  if (tg.routes !== undefined) {
    const r = record("routes", matchRoutes(tg.routes, ctx.route), `${ctx.route} vs ${tg.routes}`);
    if (r) return r;
  }
  if (tg.attributes !== undefined) {
    const r = record("attributes", matchAttributes(tg.attributes, ctx.attributes), "mismatch");
    if (r) return r;
  }
  if (tg.userId !== undefined) {
    const r = record("userId", matchUserId(tg.userId, ctx), "mismatch");
    if (r) return r;
  }
  if (tg.predicate !== undefined) {
    const r = record("predicate", tg.predicate(ctx), "false");
    if (r) return r;
  }
  return { matched: true, steps };
}
