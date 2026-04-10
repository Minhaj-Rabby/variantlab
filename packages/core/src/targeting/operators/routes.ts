/**
 * Routes operator. Iterates patterns and returns true on the first
 * match. Each pattern is parsed per call in this session; Session 4's
 * engine will pre-compile at config load.
 */

import { matchRoute } from "../glob.js";

export function matchRoutes(target: ReadonlyArray<string>, ctxRoute: string | undefined): boolean {
  if (ctxRoute === undefined) return false;
  for (let i = 0; i < target.length; i++) {
    if (matchRoute(target[i] as string, ctxRoute)) return true;
  }
  return false;
}
