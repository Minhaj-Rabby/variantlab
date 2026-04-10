/**
 * Public types for the targeting evaluator. Evaluator-only — the
 * config-level `Targeting` type (which is JSON-safe) lives in
 * `../config/types.ts`. These types layer the code-only `predicate`
 * escape hatch and the precomputed `userIdBucket` on top.
 */

import type { Experiment, Targeting, VariantContext } from "../config/types.js";

export type { Experiment, Targeting, VariantContext };

/**
 * Extended runtime context. Identical to `VariantContext` plus an
 * optional precomputed sha256 bucket (0..99) for the hash-mod userId
 * operator. The engine (Session 4) fills this on `updateContext`; the
 * evaluator itself stays synchronous and never touches Web Crypto.
 */
export interface EvalContext extends VariantContext {
  readonly userIdBucket?: number;
}

/**
 * Targeting augmented with the optional application-provided predicate
 * escape hatch. Functions can't live in JSON, so this type only exists
 * at the evaluation layer.
 */
export interface EvaluableTargeting extends Targeting {
  readonly predicate?: (context: VariantContext) => boolean;
}

/** Result of a single `evaluate()` call. */
export interface TargetingResult {
  readonly matched: boolean;
  /** The first failing field name; undefined on match. */
  readonly reason?: string;
}

/** Which field an `ExplainStep` corresponds to. */
export type ExplainField =
  | "startDate"
  | "endDate"
  | "platform"
  | "screenSize"
  | "locale"
  | "appVersion"
  | "routes"
  | "attributes"
  | "userId"
  | "predicate";

/** One step in an `explain()` trace. */
export interface ExplainStep {
  readonly field: ExplainField;
  readonly matched: boolean;
  /** Human-readable summary, e.g. "got 'ios', required one of ['android']". */
  readonly detail?: string;
}

/** Result of `explain()` — a full trace of every check performed. */
export interface ExplainResult {
  readonly matched: boolean;
  readonly reason?: ExplainField;
  readonly steps: readonly ExplainStep[];
}
