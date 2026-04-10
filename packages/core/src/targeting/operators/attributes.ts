/**
 * Attributes operator. For each specified key, strict-equality
 * against `context.attributes[key]`. An empty targeting object
 * trivially matches (no constraints).
 */

export function matchAttributes(
  target: { readonly [key: string]: unknown },
  ctxAttrs: { readonly [key: string]: unknown } | undefined,
): boolean {
  for (const k of Object.keys(target)) {
    if (ctxAttrs === undefined || ctxAttrs[k] !== target[k]) return false;
  }
  return true;
}
