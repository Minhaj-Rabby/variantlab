/**
 * User ID operator. Two modes:
 *
 * 1. List: match if `context.userId` is in the explicit string list.
 * 2. Hash bucket: match if the precomputed `userIdBucket` (0..99)
 *    is strictly less than `mod`. The evaluator is synchronous and
 *    cannot compute sha256 inline; the engine precomputes this on
 *    every `updateContext` call and stashes the result on the eval
 *    context. If the bucket is missing, the operator fails closed.
 */

import type { EvalContext, Targeting } from "../types.js";

type Target = NonNullable<Targeting["userId"]>;

export function matchUserId(target: Target, context: EvalContext): boolean {
  // `"mod" in target` narrows the discriminated union reliably — unlike
  // `Array.isArray()`, which does not narrow `ReadonlyArray<T>`.
  if ("mod" in target) {
    const bucket = context.userIdBucket;
    return typeof bucket === "number" && bucket < target.mod;
  }
  return context.userId !== undefined && target.includes(context.userId);
}
