/**
 * Screen size operator. Set membership on pre-bucketed sizes. The
 * adapter (or the engine's context updater) is responsible for
 * deriving the bucket from actual pixel dimensions.
 */

export function matchScreenSize(
  target: ReadonlyArray<string>,
  ctxSize: string | undefined,
): boolean {
  return ctxSize !== undefined && target.includes(ctxSize);
}
