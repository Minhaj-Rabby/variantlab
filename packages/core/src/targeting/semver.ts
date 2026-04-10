/**
 * Hand-rolled semver subset. No dependencies, no regex on the hot path,
 * no backtracking. Supports the surface documented in
 * `docs/design/targeting-dsl.md`:
 *
 * - Comparators: `=`, `<`, `<=`, `>`, `>=`, and a bare version (treated as `=`)
 * - Caret: `^X.Y.Z` → `[>=X.Y.Z, <(X+1).0.0]`
 * - Tilde: `~X.Y.Z` → `[>=X.Y.Z, <X.(Y+1).0]`
 * - Hyphen range: `X.Y.Z - A.B.C` → `[>=X.Y.Z, <=A.B.C]`
 * - Compound (AND): space-separated comparators, e.g. `>=1.0.0 <2.0.0`
 * - OR: `||`-separated clauses
 *
 * Explicitly rejects prereleases (`1.0.0-beta`), build metadata
 * (`1.0.0+sha`), and `x` wildcards (`1.2.x`).
 */

export type Version = readonly [number, number, number];
export type Op = "=" | "<" | "<=" | ">" | ">=";
export interface Comparator {
  readonly op: Op;
  readonly v: Version;
}
export type Clause = readonly Comparator[];
export type Range = readonly Clause[];

/**
 * Pure character scanner. No regex. Returns `[major, minor, patch]`
 * or `null` if the string is not exactly three dot-separated
 * non-negative integers.
 */
export function parseVersion(s: string): Version | null {
  if (s.length === 0) return null;
  const parts: number[] = [0, 0, 0];
  let idx = 0;
  let part = 0;
  let seen = false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 46 /* . */) {
      if (!seen) return null;
      parts[idx++] = part;
      if (idx > 2) return null;
      part = 0;
      seen = false;
    } else if (c >= 48 && c <= 57) {
      part = part * 10 + (c - 48);
      seen = true;
    } else return null;
  }
  if (!seen || idx !== 2) return null;
  parts[2] = part;
  return [parts[0] as number, parts[1] as number, parts[2] as number];
}

/** Numeric comparison, field by field. */
export function cmpVersion(a: Version, b: Version): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/**
 * Parse a semver range string. Returns a `Range` on success or `null`
 * on any syntactic or structural error.
 */
export function parseSemver(s: string): Range | null {
  if (s.length === 0) return null;
  const clauses: Clause[] = [];
  for (const part of s.split("||")) {
    const c = parseClause(part.trim());
    if (c === null) return null;
    clauses.push(c);
  }
  return clauses;
}

function parseClause(s: string): Clause | null {
  if (s.length === 0) return null;

  // Hyphen range: `X.Y.Z - A.B.C`. Whitespace-sensitive separator.
  const hy = s.indexOf(" - ");
  if (hy >= 0) {
    const lo = parseVersion(s.slice(0, hy).trim());
    const hi = parseVersion(s.slice(hy + 3).trim());
    if (lo === null || hi === null) return null;
    return [
      { op: ">=", v: lo },
      { op: "<=", v: hi },
    ];
  }

  // Compound: whitespace-separated comparators, all ANDed.
  const cmps: Comparator[] = [];
  for (const tok of s.split(/\s+/)) {
    if (tok.length === 0) continue;
    const parsed = parseComparator(tok);
    if (parsed === null) return null;
    for (const c of parsed) cmps.push(c);
  }
  return cmps.length > 0 ? cmps : null;
}

/**
 * Parse a single comparator like `>=1.2.3`, `^1.2.3`, `~1.2.3`, or a
 * bare version. Returns an array so that caret/tilde can expand to
 * two comparators.
 */
function parseComparator(s: string): Comparator[] | null {
  const c0 = s[0];
  if (c0 === "^" || c0 === "~") {
    const v = parseVersion(s.slice(1));
    if (v === null) return null;
    const upper: Version = c0 === "^" ? [v[0] + 1, 0, 0] : [v[0], v[1] + 1, 0];
    return [
      { op: ">=", v },
      { op: "<", v: upper },
    ];
  }

  let op: Op = "=";
  let rest = s;
  if (c0 === ">" || c0 === "<") {
    if (s[1] === "=") {
      op = `${c0}=` as Op;
      rest = s.slice(2);
    } else {
      op = c0;
      rest = s.slice(1);
    }
  } else if (c0 === "=") {
    rest = s.slice(1);
  }

  const v = parseVersion(rest);
  return v === null ? null : [{ op, v }];
}

/** Match a parsed range against a parsed version. */
export function matchCompiled(range: Range, version: Version): boolean {
  for (const clause of range) if (matchClause(clause, version)) return true;
  return false;
}

function matchClause(clause: Clause, version: Version): boolean {
  for (const c of clause) {
    const d = cmpVersion(version, c.v);
    const op = c.op;
    const fail =
      op === "="
        ? d !== 0
        : op === "<"
          ? d >= 0
          : op === "<="
            ? d > 0
            : op === ">"
              ? d <= 0
              : d < 0;
    if (fail) return false;
  }
  return true;
}

/** Convenience: parse both sides and compare. Returns false on parse error. */
export function matchSemver(range: string, version: string): boolean {
  const r = parseSemver(range);
  if (r === null) return false;
  const v = parseVersion(version);
  return v !== null && matchCompiled(r, v);
}
