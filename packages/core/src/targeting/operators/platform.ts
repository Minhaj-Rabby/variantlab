/**
 * Platform operator. Set membership; fails if the context's platform
 * is undefined. Linear scan is cheap — at most 4 elements per the
 * config allow-list.
 */

export function matchPlatform(
  target: ReadonlyArray<string>,
  ctxPlatform: string | undefined,
): boolean {
  return ctxPlatform !== undefined && target.includes(ctxPlatform);
}
