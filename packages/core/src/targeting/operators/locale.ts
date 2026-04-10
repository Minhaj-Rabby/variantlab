/**
 * Locale operator. For each target in the array, matches if the
 * context locale equals the target OR starts with `target + "-"`.
 *
 * Targeting `"en"` matches `"en"`, `"en-US"`, `"en-GB"`.
 * Targeting `"en-US"` matches `"en-US"`, `"en-US-POSIX"` but not
 * `"en"` or `"en-GB"`.
 *
 * Case-sensitive — config authors are expected to normalize.
 */

export function matchLocale(target: ReadonlyArray<string>, ctxLocale: string | undefined): boolean {
  if (ctxLocale === undefined) return false;
  for (const t of target) {
    if (ctxLocale === t || ctxLocale.startsWith(`${t}-`)) return true;
  }
  return false;
}
