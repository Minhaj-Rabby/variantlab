export { canonicalStringify } from "./canonical.js";
export type { IssueCode } from "./codes.js";
export { type ConfigIssue, ConfigValidationError } from "./errors.js";
export { deepFreeze } from "./freeze.js";
export type {
  AssignmentStrategy,
  Experiment,
  ExperimentsConfig,
  RollbackConfig,
  Targeting,
  Variant,
  VariantContext,
} from "./types.js";
export { validateConfig } from "./validator.js";
