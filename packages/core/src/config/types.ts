/**
 * Public TypeScript shapes for `experiments.json`.
 *
 * All fields are `readonly` so that the deeply-frozen result of
 * `validateConfig()` is also type-level immutable. Downstream code
 * should import these as `import type`.
 *
 * Mirrors the surface declared in `API.md` §Types.
 */

/** Assignment strategy. */
export type AssignmentStrategy = "default" | "random" | "sticky-hash" | "weighted";

/** Runtime context used for targeting and assignment. */
export interface VariantContext {
  readonly userId?: string;
  readonly route?: string;
  readonly platform?: string;
  readonly appVersion?: string;
  readonly locale?: string;
  readonly screenSize?: "small" | "medium" | "large";
  readonly attributes?: { readonly [key: string]: string | number | boolean };
}

/** Targeting predicate. All fields optional; all specified fields must match. */
export interface Targeting {
  readonly platform?: ReadonlyArray<"ios" | "android" | "web" | "node">;
  readonly appVersion?: string;
  readonly locale?: ReadonlyArray<string>;
  readonly screenSize?: ReadonlyArray<"small" | "medium" | "large">;
  readonly routes?: ReadonlyArray<string>;
  readonly userId?: ReadonlyArray<string> | { readonly hash: string; readonly mod: number };
  readonly attributes?: { readonly [key: string]: unknown };
}

/** Crash-rollback configuration. */
export interface RollbackConfig {
  readonly threshold: number;
  readonly window: number;
  readonly persistent?: boolean;
}

/** A variant of an experiment. */
export interface Variant {
  readonly id: string;
  readonly label?: string;
  readonly description?: string;
  readonly value?: unknown;
}

/** A single experiment definition. */
export interface Experiment {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly type?: "render" | "value";
  readonly variants: ReadonlyArray<Variant>;
  readonly default: string;
  readonly routes?: ReadonlyArray<string>;
  readonly targeting?: Targeting;
  readonly assignment?: AssignmentStrategy;
  readonly split?: { readonly [variantId: string]: number };
  readonly mutex?: string;
  readonly rollback?: RollbackConfig;
  readonly status?: "draft" | "active" | "archived";
  readonly startDate?: string;
  readonly endDate?: string;
  readonly owner?: string;
  readonly overridable?: boolean;
}

/** Top-level config file shape. */
export interface ExperimentsConfig {
  readonly version: 1;
  readonly signature?: string;
  readonly enabled?: boolean;
  readonly experiments: ReadonlyArray<Experiment>;
}
