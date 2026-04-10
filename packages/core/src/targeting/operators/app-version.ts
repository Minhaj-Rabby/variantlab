/**
 * App version operator. Wraps the semver matcher. Fail-closed if the
 * context version is missing or unparseable.
 */

import { matchSemver } from "../semver.js";

export function matchAppVersion(range: string, ctxVersion: string | undefined): boolean {
  if (ctxVersion === undefined) return false;
  return matchSemver(range, ctxVersion);
}
