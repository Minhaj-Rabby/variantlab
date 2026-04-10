/**
 * Synchronous targeting evaluator. Walks the operators in the order
 * documented in `docs/design/targeting-dsl.md` and short-circuits on
 * the first failure.
 *
 * Order: platform → screenSize → locale → appVersion → routes →
 *        attributes → userId → predicate
 *
 * The `enabled` kill switch and `startDate`/`endDate` are experiment-
 * level and live in `explain()` + Session 4's engine — they're not
 * part of `evaluate()`.
 */

import { matchAppVersion } from "./operators/app-version.js";
import { matchAttributes } from "./operators/attributes.js";
import { matchLocale } from "./operators/locale.js";
import { matchPlatform } from "./operators/platform.js";
import { matchRoutes } from "./operators/routes.js";
import { matchScreenSize } from "./operators/screen-size.js";
import { matchUserId } from "./operators/user-id.js";
import type { EvalContext, EvaluableTargeting, TargetingResult, VariantContext } from "./types.js";

export function evaluate(
  targeting: EvaluableTargeting,
  context: VariantContext | EvalContext,
): TargetingResult {
  const c = context as EvalContext;
  if (targeting.platform !== undefined && !matchPlatform(targeting.platform, c.platform))
    return { matched: false, reason: "platform" };
  if (targeting.screenSize !== undefined && !matchScreenSize(targeting.screenSize, c.screenSize))
    return { matched: false, reason: "screenSize" };
  if (targeting.locale !== undefined && !matchLocale(targeting.locale, c.locale))
    return { matched: false, reason: "locale" };
  if (targeting.appVersion !== undefined && !matchAppVersion(targeting.appVersion, c.appVersion))
    return { matched: false, reason: "appVersion" };
  if (targeting.routes !== undefined && !matchRoutes(targeting.routes, c.route))
    return { matched: false, reason: "routes" };
  if (targeting.attributes !== undefined && !matchAttributes(targeting.attributes, c.attributes))
    return { matched: false, reason: "attributes" };
  if (targeting.userId !== undefined && !matchUserId(targeting.userId, c))
    return { matched: false, reason: "userId" };
  if (targeting.predicate !== undefined && !targeting.predicate(c))
    return { matched: false, reason: "predicate" };
  return { matched: true };
}

/** Thin convenience wrapper — matches the `API.md` surface. */
export function matchTargeting(
  targeting: EvaluableTargeting,
  context: VariantContext | EvalContext,
): boolean {
  return evaluate(targeting, context).matched;
}
