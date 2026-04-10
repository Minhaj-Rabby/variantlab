/**
 * Hand-rolled route glob subset. Linear-time matcher, no regex, no
 * backtracking, no character classes. Supports the surface in
 * `docs/design/targeting-dsl.md`:
 *
 * - Exact: `/about`
 * - Wildcard segment: `/blog/*`
 * - Wildcard deep: `/docs/**` (only allowed as the last segment)
 * - Parameter: `/user/:id` (treated as a single-segment wildcard)
 * - Trailing slash insensitive
 * - Whole-path forms: `*` (single-segment) and `**` (any number of segments)
 *
 * Rejects: character classes, braces, negation, `***`, mixed
 * literal+wildcard in a single segment (e.g. `/foo*bar`).
 */

export type Segment =
  | { readonly kind: "literal"; readonly value: string }
  | { readonly kind: "param" }
  | { readonly kind: "rest" };

/**
 * Compile a glob pattern into a segment list. Returns `null` for
 * unsupported / malformed patterns. Compiled patterns can be reused
 * and are the hot-path form.
 */
export function compileGlob(pattern: string): Segment[] | null {
  if (pattern.length === 0) return null;

  // Whole-path shortcuts. `*` and `**` have no leading slash.
  if (pattern === "*") return [{ kind: "param" }];
  if (pattern === "**") return [{ kind: "rest" }];

  if (pattern[0] !== "/") return null;

  // Reject `***` anywhere outright.
  if (pattern.indexOf("***") >= 0) return null;

  // Strip a trailing slash (except for the root `/` itself).
  const normalized = pattern.length > 1 && pattern.endsWith("/") ? pattern.slice(0, -1) : pattern;

  // Root: single empty segment list means "match `/` exactly".
  if (normalized === "/") return [];

  const raw = normalized.slice(1).split("/");
  const segs: Segment[] = [];
  for (let i = 0; i < raw.length; i++) {
    const part = raw[i] as string;
    if (part.length === 0) return null; // e.g. `//` or trailing empty
    if (part === "**") {
      // `**` must be the last segment.
      if (i !== raw.length - 1) return null;
      segs.push({ kind: "rest" });
      continue;
    }
    if (part === "*") {
      segs.push({ kind: "param" });
      continue;
    }
    if (part[0] === ":") {
      // `:id` — single-segment wildcard. Disallow empty name `:` alone.
      if (part.length < 2) return null;
      segs.push({ kind: "param" });
      continue;
    }
    // Literal segment. Reject any wildcard chars or colons inside.
    // Compile-time regex (not hot path); linear, no backtracking.
    if (/[*:?[\]{}!]/.test(part)) return null;
    segs.push({ kind: "literal", value: part });
  }
  return segs;
}

/**
 * Match a compiled glob against a path. O(n + m) linear, no
 * backtracking because `**` is only ever the final segment.
 */
export function matchCompiledRoute(segs: readonly Segment[], path: string): boolean {
  if (path.length === 0) return false;
  if (path[0] !== "/") return false;

  // Strip a trailing slash (except for the root `/`).
  const normalized = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

  // Root `/` case: empty segment list matches exactly `/`.
  if (segs.length === 0) return normalized === "/";

  const parts = normalized === "/" ? [] : normalized.slice(1).split("/");

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i] as Segment;
    if (seg.kind === "rest") {
      // `**` tail — matches zero or more remaining parts.
      return true;
    }
    if (i >= parts.length) return false;
    const part = parts[i] as string;
    if (part.length === 0) return false;
    if (seg.kind === "literal") {
      if (seg.value !== part) return false;
    }
    // `param` always matches a non-empty part.
  }
  return parts.length === segs.length;
}

/** Convenience: compile and match. Returns false on compile error. */
export function matchRoute(pattern: string, path: string): boolean {
  const segs = compileGlob(pattern);
  if (segs === null) return false;
  return matchCompiledRoute(segs, path);
}
