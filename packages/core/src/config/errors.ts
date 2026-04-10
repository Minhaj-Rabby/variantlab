import type { IssueCode } from "./codes.js";

/**
 * A single config-validation issue.
 *
 * `path` is an RFC 6901 JSON Pointer into the source config
 * (`""` for root, `"/experiments/0/variants/2/id"` for nested).
 * `code` is a narrow union of strings for programmatic handling.
 * `message` is a human-readable sentence safe for CLI output.
 */
export interface ConfigIssue {
  readonly path: string;
  readonly code: IssueCode;
  readonly message: string;
}

/**
 * Thrown by `validateConfig` when one or more rules fail.
 *
 * `issues` is always non-empty and frozen. The validator collects
 * every issue it finds and throws once at the end — it does not
 * fail fast — so a single throw can surface many independent
 * problems in one pass.
 */
export class ConfigValidationError extends Error {
  readonly issues: readonly ConfigIssue[];

  constructor(issues: readonly ConfigIssue[]) {
    super(`Config validation failed with ${issues.length} issue(s)`);
    this.name = "ConfigValidationError";
    this.issues = Object.freeze(issues.slice());
  }
}
