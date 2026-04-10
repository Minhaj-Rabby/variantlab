import type { IssueCode } from "./codes.js";
import { type ConfigIssue, ConfigValidationError } from "./errors.js";
import { deepFreeze } from "./freeze.js";
import type { ExperimentsConfig } from "./types.js";

/* Limits (see docs/design/config-format.md). */
const MAX_BYTES = 1_048_576;
const MAX_EXP = 1000;
const MAX_VAR = 100;
const MIN_VAR = 2;
const MAX_ROUTES = 100;
const MAX_DEPTH = 10;
const MAX_NAME = 128;
const MAX_DESC = 512;

const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const RESERVED = new Set(["__proto__", "constructor", "prototype"]);
const ASSIGNS = new Set(["default", "random", "sticky-hash", "weighted"]);
const STATUSES = new Set(["draft", "active", "archived"]);
const TYPES = new Set(["render", "value"]);
const PLATFORMS = new Set(["ios", "android", "web", "node"]);
const SIZES = new Set(["small", "medium", "large"]);

// `TextEncoder` is standardized in Node 18+, browsers, Deno, Bun, and
// Edge runtimes — the only platform global `@variantlab/core` uses.
declare class TextEncoder {
  encode(input?: string): Uint8Array;
}

/**
 * Parse, sanitize, validate, and deep-freeze an experiments config.
 * Collects every issue before throwing (fail-slow, not fail-fast).
 */
export function validateConfig(input: unknown): ExperimentsConfig {
  const issues: ConfigIssue[] = [];

  if (measureBytes(input) > MAX_BYTES) {
    push(issues, "", "config-too-large");
    throw new ConfigValidationError(issues);
  }

  let parsed: unknown = input;
  if (typeof input === "string") {
    try {
      parsed = JSON.parse(input);
    } catch (err) {
      push(issues, "", "invalid-json", (err as Error).message);
      throw new ConfigValidationError(issues);
    }
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    push(issues, "", "not-an-object");
    throw new ConfigValidationError(issues);
  }

  const sanitized = sanitize(parsed, issues, "");
  validateRoot(sanitized as Record<string, unknown>, issues);

  if (issues.length > 0) {
    throw new ConfigValidationError(issues);
  }
  return deepFreeze(sanitized as ExperimentsConfig);
}

/* Raw-bytes measurement. Strings: exact UTF-8. Objects: approximate
 * via JSON.stringify then UTF-8 length. The goal is to cap untrusted
 * input memory, so approximate is fine. */
const encoder = new TextEncoder();
function measureBytes(input: unknown): number {
  if (typeof input === "string") return encoder.encode(input).length;
  try {
    const s = JSON.stringify(input);
    if (typeof s !== "string") return 0;
    return encoder.encode(s).length;
  } catch {
    return 0;
  }
}

/* Sanitize: rebuild every object with Object.create(null) and copy
 * only own, non-reserved keys. Produces a null-proto tree. */
function sanitize(value: unknown, issues: ConfigIssue[], ptr: string): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (let i = 0; i < value.length; i++) {
      out.push(sanitize(value[i], issues, `${ptr}/${i}`));
    }
    return out;
  }
  const src = value as Record<string, unknown>;
  const dst: Record<string, unknown> = Object.create(null);
  const keys = Object.keys(src);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i] as string;
    if (RESERVED.has(k)) {
      push(issues, jp(ptr, k), "reserved-key", k);
      continue;
    }
    dst[k] = sanitize(src[k], issues, jp(ptr, k));
  }
  return dst;
}

function validateRoot(root: Record<string, unknown>, issues: ConfigIssue[]): void {
  const version = root["version"];
  if (version === undefined) {
    push(issues, "/version", "version/missing");
  } else if (version !== 1) {
    push(issues, "/version", "version/invalid");
  }

  const enabled = root["enabled"];
  if (enabled !== undefined && typeof enabled !== "boolean") {
    push(issues, "/enabled", "enabled/invalid");
  }

  const signature = root["signature"];
  if (signature !== undefined && (typeof signature !== "string" || signature.length === 0)) {
    push(issues, "/signature", "signature/invalid");
  }

  const experiments = root["experiments"];
  if (experiments === undefined) {
    push(issues, "/experiments", "experiments/missing");
    return;
  }
  if (!Array.isArray(experiments)) {
    push(issues, "/experiments", "experiments/not-an-array");
    return;
  }
  if (experiments.length > MAX_EXP) {
    push(issues, "/experiments", "experiments/too-many");
  }

  const seen = new Set<string>();
  for (let i = 0; i < experiments.length; i++) {
    validateExperiment(experiments[i], `/experiments/${i}`, seen, issues);
  }
}

function validateExperiment(
  exp: unknown,
  p: string,
  seen: Set<string>,
  issues: ConfigIssue[],
): void {
  if (exp === null || typeof exp !== "object" || Array.isArray(exp)) {
    push(issues, p, "experiment/not-an-object");
    return;
  }
  const e = exp as Record<string, unknown>;

  const id = e["id"];
  if (id === undefined) {
    push(issues, `${p}/id`, "experiment/missing-required", "id");
  } else if (typeof id !== "string" || !ID_RE.test(id)) {
    push(issues, `${p}/id`, "experiment/id/invalid");
  } else if (seen.has(id)) {
    push(issues, `${p}/id`, "experiment/id/duplicate", id);
  } else {
    seen.add(id);
  }

  const name = e["name"];
  if (name === undefined) {
    push(issues, `${p}/name`, "experiment/missing-required", "name");
  } else if (typeof name !== "string" || name.length === 0 || name.length > MAX_NAME) {
    push(issues, `${p}/name`, "experiment/name/invalid");
  }

  checkOptString(
    e["description"],
    `${p}/description`,
    MAX_DESC,
    "experiment/description/invalid",
    issues,
  );
  checkEnum(e["type"], `${p}/type`, TYPES, "experiment/type/invalid", issues);
  checkEnum(e["status"], `${p}/status`, STATUSES, "experiment/status/invalid", issues);
  checkOptString(e["mutex"], `${p}/mutex`, MAX_NAME, "experiment/mutex/invalid", issues);
  checkOptString(e["owner"], `${p}/owner`, MAX_NAME, "experiment/owner/invalid", issues);
  checkOptBool(e["overridable"], `${p}/overridable`, "experiment/overridable/invalid", issues);

  const variantIds = validateVariants(e["variants"], p, issues);
  validateDefault(e["default"], variantIds, p, issues);
  validateAssignment(e["assignment"], e["split"], variantIds, p, issues);
  validateRoutes(e["routes"], p, issues);
  validateTargeting(e["targeting"], p, issues);
  validateDates(e["startDate"], e["endDate"], p, issues);
  validateRollback(e["rollback"], p, issues);
}

function validateVariants(field: unknown, p: string, issues: ConfigIssue[]): Set<string> {
  const ids = new Set<string>();
  const vp = `${p}/variants`;
  if (field === undefined) {
    push(issues, vp, "experiment/variants/missing");
    return ids;
  }
  if (!Array.isArray(field)) {
    push(issues, vp, "experiment/variants/missing");
    return ids;
  }
  if (field.length < MIN_VAR) {
    push(issues, vp, "experiment/variants/too-few");
  }
  if (field.length > MAX_VAR) {
    push(issues, vp, "experiment/variants/too-many");
  }
  for (let i = 0; i < field.length; i++) {
    const v = field[i];
    const vip = `${vp}/${i}`;
    if (v === null || typeof v !== "object" || Array.isArray(v)) {
      push(issues, vip, "variant/not-an-object");
      continue;
    }
    const vo = v as Record<string, unknown>;
    const vid = vo["id"];
    if (vid === undefined) {
      push(issues, `${vip}/id`, "experiment/missing-required", "variant.id");
    } else if (typeof vid !== "string" || !ID_RE.test(vid)) {
      push(issues, `${vip}/id`, "variant/id/invalid");
    } else if (ids.has(vid)) {
      push(issues, `${vip}/id`, "variant/id/duplicate", vid);
    } else {
      ids.add(vid);
    }
    checkOptString(vo["label"], `${vip}/label`, MAX_NAME, "variant/label/invalid", issues);
    checkOptString(
      vo["description"],
      `${vip}/description`,
      MAX_DESC,
      "variant/description/invalid",
      issues,
    );
  }
  return ids;
}

function validateDefault(field: unknown, ids: Set<string>, p: string, issues: ConfigIssue[]): void {
  const dp = `${p}/default`;
  if (field === undefined) {
    push(issues, dp, "experiment/default/missing");
    return;
  }
  if (typeof field !== "string") {
    push(issues, dp, "experiment/default/unknown-variant");
    return;
  }
  if (ids.size > 0 && !ids.has(field)) {
    push(issues, dp, "experiment/default/unknown-variant", field);
  }
}

function validateAssignment(
  aField: unknown,
  sField: unknown,
  ids: Set<string>,
  p: string,
  issues: ConfigIssue[],
): void {
  let strategy = "default";
  if (aField !== undefined) {
    if (typeof aField !== "string" || !ASSIGNS.has(aField)) {
      push(issues, `${p}/assignment`, "experiment/assignment/invalid");
    } else {
      strategy = aField;
    }
  }

  const sp = `${p}/split`;
  if (strategy === "weighted" && sField === undefined) {
    push(issues, sp, "split/missing");
    return;
  }
  if (sField === undefined) return;
  if (sField === null || typeof sField !== "object" || Array.isArray(sField)) {
    push(issues, sp, "split/not-an-object");
    return;
  }
  const split = sField as Record<string, unknown>;
  const keys = Object.keys(split);
  let sum = 0;
  let bad = false;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i] as string;
    if (ids.size > 0 && !ids.has(k)) {
      push(issues, `${sp}/${esc(k)}`, "split/unknown-variant", k);
      bad = true;
      continue;
    }
    const v = split[k];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 100) {
      push(issues, `${sp}/${esc(k)}`, "split/value-invalid");
      bad = true;
      continue;
    }
    sum += v;
  }
  if (!bad && sum !== 100) {
    push(issues, sp, "split/sum-invalid", String(sum));
  }
}

function validateRoutes(field: unknown, p: string, issues: ConfigIssue[]): void {
  if (field === undefined) return;
  const rp = `${p}/routes`;
  if (!Array.isArray(field)) {
    push(issues, rp, "experiment/routes/invalid");
    return;
  }
  if (field.length > MAX_ROUTES) {
    push(issues, rp, "experiment/routes/invalid");
  }
  for (let i = 0; i < field.length; i++) {
    const r = field[i];
    if (typeof r !== "string" || !isValidGlob(r)) {
      push(issues, `${rp}/${i}`, "route/glob/invalid");
    }
  }
}

function validateTargeting(field: unknown, p: string, issues: ConfigIssue[]): void {
  if (field === undefined) return;
  const tp = `${p}/targeting`;
  if (field === null || typeof field !== "object" || Array.isArray(field)) {
    push(issues, tp, "targeting/not-an-object");
    return;
  }
  if (depthOf(field, 0) > MAX_DEPTH) {
    push(issues, tp, "targeting/depth-exceeded");
  }
  const t = field as Record<string, unknown>;

  if (t["platform"] !== undefined) {
    checkEnumArray(
      t["platform"],
      `${tp}/platform`,
      PLATFORMS,
      "targeting/platform/invalid",
      issues,
    );
  }
  if (t["appVersion"] !== undefined) {
    const v = t["appVersion"];
    if (typeof v !== "string" || !isValidSemver(v)) {
      push(issues, `${tp}/appVersion`, "targeting/appversion/invalid");
    }
  }
  if (t["locale"] !== undefined) {
    checkStringArray(t["locale"], `${tp}/locale`, "targeting/locale/invalid", issues);
  }
  if (t["screenSize"] !== undefined) {
    checkEnumArray(
      t["screenSize"],
      `${tp}/screenSize`,
      SIZES,
      "targeting/screensize/invalid",
      issues,
    );
  }
  if (t["routes"] !== undefined) {
    const r = t["routes"];
    if (!Array.isArray(r) || r.length === 0) {
      push(issues, `${tp}/routes`, "targeting/routes/invalid");
    } else {
      for (let i = 0; i < r.length; i++) {
        const v = r[i];
        if (typeof v !== "string" || !isValidGlob(v)) {
          push(issues, `${tp}/routes/${i}`, "targeting/routes/invalid");
        }
      }
    }
  }
  if (t["userId"] !== undefined) {
    validateUserId(t["userId"], `${tp}/userId`, issues);
  }
  if (t["attributes"] !== undefined) {
    const a = t["attributes"];
    if (a === null || typeof a !== "object" || Array.isArray(a)) {
      push(issues, `${tp}/attributes`, "targeting/attributes/invalid");
    }
  }
}

function validateUserId(u: unknown, p: string, issues: ConfigIssue[]): void {
  const code: IssueCode = "targeting/userid/invalid";
  if (Array.isArray(u)) {
    if (u.length === 0) {
      push(issues, p, code);
      return;
    }
    for (let i = 0; i < u.length; i++) {
      const v = u[i];
      if (typeof v !== "string" || v.length === 0) {
        push(issues, `${p}/${i}`, code);
      }
    }
    return;
  }
  if (u !== null && typeof u === "object") {
    const o = u as Record<string, unknown>;
    const h = o["hash"];
    const m = o["mod"];
    if (typeof h !== "string" || h.length === 0) {
      push(issues, `${p}/hash`, code);
    }
    if (typeof m !== "number" || !Number.isInteger(m) || m < 0 || m > 100) {
      push(issues, `${p}/mod`, code);
    }
    return;
  }
  push(issues, p, code);
}

function validateDates(sField: unknown, eField: unknown, p: string, issues: ConfigIssue[]): void {
  let s: number | undefined;
  let e: number | undefined;
  if (sField !== undefined) {
    if (typeof sField !== "string" || !isValidIsoDate(sField)) {
      push(issues, `${p}/startDate`, "experiment/startdate/invalid");
    } else {
      s = Date.parse(sField);
    }
  }
  if (eField !== undefined) {
    if (typeof eField !== "string" || !isValidIsoDate(eField)) {
      push(issues, `${p}/endDate`, "experiment/enddate/invalid");
    } else {
      e = Date.parse(eField);
    }
  }
  if (s !== undefined && e !== undefined && !(e > s)) {
    push(issues, `${p}/endDate`, "experiment/date-range/invalid");
  }
}

function validateRollback(field: unknown, p: string, issues: ConfigIssue[]): void {
  if (field === undefined) return;
  const rp = `${p}/rollback`;
  if (field === null || typeof field !== "object" || Array.isArray(field)) {
    push(issues, rp, "rollback/not-an-object");
    return;
  }
  const r = field as Record<string, unknown>;
  const thr = r["threshold"];
  if (thr === undefined) {
    push(issues, `${rp}/threshold`, "rollback/threshold/invalid");
  } else if (typeof thr !== "number" || !Number.isInteger(thr) || thr < 1 || thr > 100) {
    push(issues, `${rp}/threshold`, "rollback/threshold/invalid");
  }
  const win = r["window"];
  if (win === undefined) {
    push(issues, `${rp}/window`, "rollback/window/invalid");
  } else if (typeof win !== "number" || !Number.isInteger(win) || win < 1000 || win > 3_600_000) {
    push(issues, `${rp}/window`, "rollback/window/invalid");
  }
  const persistent = r["persistent"];
  if (persistent !== undefined && typeof persistent !== "boolean") {
    push(issues, `${rp}/persistent`, "rollback/persistent/invalid");
  }
}

/* Small shared helpers. */

function checkOptString(
  v: unknown,
  p: string,
  max: number,
  code: IssueCode,
  issues: ConfigIssue[],
): void {
  if (v === undefined) return;
  if (typeof v !== "string" || v.length === 0 || v.length > max) {
    push(issues, p, code);
  }
}

function checkOptBool(v: unknown, p: string, code: IssueCode, issues: ConfigIssue[]): void {
  if (v === undefined) return;
  if (typeof v !== "boolean") {
    push(issues, p, code);
  }
}

function checkEnum(
  v: unknown,
  p: string,
  set: Set<string>,
  code: IssueCode,
  issues: ConfigIssue[],
): void {
  if (v === undefined) return;
  if (typeof v !== "string" || !set.has(v)) {
    push(issues, p, code);
  }
}

function checkEnumArray(
  v: unknown,
  p: string,
  set: Set<string>,
  code: IssueCode,
  issues: ConfigIssue[],
): void {
  if (!Array.isArray(v) || v.length === 0) {
    push(issues, p, code);
    return;
  }
  for (let i = 0; i < v.length; i++) {
    const x = v[i];
    if (typeof x !== "string" || !set.has(x)) {
      push(issues, `${p}/${i}`, code);
    }
  }
}

function checkStringArray(v: unknown, p: string, code: IssueCode, issues: ConfigIssue[]): void {
  if (!Array.isArray(v) || v.length === 0) {
    push(issues, p, code);
    return;
  }
  for (let i = 0; i < v.length; i++) {
    const x = v[i];
    if (typeof x !== "string" || x.length === 0) {
      push(issues, `${p}/${i}`, code);
    }
  }
}

/* ISO 8601 date: Date.parse must accept and the string must contain
 * T + Z-or-offset, to reject bare dates like "2026-01-01". */
const ISO_TAIL_RE = /T.*(?:Z|[+-]\d{2}:?\d{2})$/;
function isValidIsoDate(s: string): boolean {
  if (s.length < 10) return false;
  if (Number.isNaN(Date.parse(s))) return false;
  return ISO_TAIL_RE.test(s);
}

/* Stub glob validator — Session 3 replaces with the real matcher. */
const GLOB_RE = /^[A-Za-z0-9_\-/.:*]+$/;
function isValidGlob(s: string): boolean {
  if (s.length === 0 || s.includes("***")) return false;
  if (!GLOB_RE.test(s)) return false;
  return s === "*" || s === "**" || s[0] === "/";
}

/* Stub semver range validator — Session 3 replaces. */
const SEMVER_CORE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const SEMVER_CMP = /^(?:=|>=|<=|>|<|\^|~)?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
function isValidSemver(s: string): boolean {
  if (s.length === 0) return false;
  const ors = s.split("||");
  for (let i = 0; i < ors.length; i++) {
    const part = (ors[i] as string).trim();
    if (part.length === 0) return false;
    const hy = part.split(/\s+-\s+/);
    if (hy.length === 2) {
      if (!SEMVER_CORE.test(hy[0] as string) || !SEMVER_CORE.test(hy[1] as string)) {
        return false;
      }
      continue;
    }
    const ands = part.split(/\s+/);
    for (let j = 0; j < ands.length; j++) {
      if (!SEMVER_CMP.test(ands[j] as string)) return false;
    }
  }
  return true;
}

/* Depth of a value inside the targeting subtree (root = 0). */
function depthOf(value: unknown, current: number): number {
  if (value === null || typeof value !== "object") return current;
  let m = current;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const d = depthOf(value[i], current + 1);
      if (d > m) m = d;
    }
    return m;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const d = depthOf(obj[keys[i] as string], current + 1);
    if (d > m) m = d;
  }
  return m;
}

/* RFC 6901 encoders. */
function jp(parent: string, key: string): string {
  return `${parent}/${esc(key)}`;
}
function esc(s: string): string {
  return s.replace(/~/g, "~0").replace(/\//g, "~1");
}

/**
 * Append an issue. The `message` defaults to the code itself — issue
 * messages are intentionally terse so that bundle size stays under
 * budget. Consumers that want pretty messages should switch on `code`.
 */
function push(issues: ConfigIssue[], path: string, code: IssueCode, message?: string): void {
  issues.push({ path, code, message: message ?? code });
}
