# @variantlab/core

> The framework-agnostic A/B testing and feature-flag engine. Zero runtime dependencies, runs anywhere.

![npm version](https://img.shields.io/npm/v/@variantlab/core?label=npm&color=blue)
![bundle size](https://img.shields.io/badge/gzip-%3C3KB-brightgreen)
![dependencies](https://img.shields.io/badge/runtime%20deps-0-brightgreen)

## Install

```bash
npm install @variantlab/core
```

## Quick start

### 1. Define experiments

Create an `experiments.json` file:

```json
{
  "version": 1,
  "experiments": [
    {
      "id": "cta-copy",
      "name": "CTA button copy",
      "type": "value",
      "default": "buy-now",
      "variants": [
        { "id": "buy-now", "value": "Buy now" },
        { "id": "get-started", "value": "Get started" }
      ]
    },
    {
      "id": "hero-layout",
      "name": "Hero layout",
      "type": "render",
      "default": "centered",
      "variants": [
        { "id": "centered" },
        { "id": "split" }
      ]
    }
  ]
}
```

### 2. Create the engine

```ts
import { createEngine } from "@variantlab/core";
import experiments from "./experiments.json";

const engine = createEngine(experiments);
```

### 3. Get variants

```ts
// Get assigned variant ID
const variant = engine.getVariant("hero-layout"); // "centered" | "split"

// Get a value experiment's value
const cta = engine.getVariantValue("cta-copy"); // "Buy now" | "Get started"

// Override for testing
engine.setVariant("hero-layout", "split");

// Clear override
engine.clearVariant("hero-layout");

// Reset all overrides
engine.resetAll();
```

### 4. Subscribe to changes

```ts
engine.subscribe((event) => {
  console.log(event.experimentId, event.variantId);
});
```

### 5. Targeting context

```ts
const engine = createEngine(experiments, {
  context: {
    userId: "user-123",
    platform: "web",
    locale: "en",
    screenSize: "large",
    appVersion: "2.1.0",
  },
});

// Update context at runtime
engine.updateContext({ locale: "bn" });
```

## Config validation

```ts
import { validateConfig } from "@variantlab/core";

const result = validateConfig(experiments);
if (!result.ok) {
  console.error(result.issues);
}
```

## Explain targeting (debug)

```ts
import { explain } from "@variantlab/core";

const trace = explain(experiments, "hero-layout", {
  platform: "ios",
  screenSize: "small",
});
// Returns step-by-step targeting trace with pass/fail per field
```

## Key features

- Zero runtime dependencies
- < 3 KB gzipped
- O(1) hot-path `getVariant()` calls
- Kill switch and time-gated experiments
- Mutex groups (mutually exclusive experiments)
- Crash counter for auto-rollback
- History ring buffer
- `Object.freeze` on loaded config
- Prototype pollution guards
- CSP-strict compatible (no `eval`, no `Function()`)
- Works in Node, Deno, Bun, Cloudflare Workers, browsers, and React Native

## Framework adapters

Use `@variantlab/core` directly for vanilla JS/TS, or pair it with a framework adapter:

- [`@variantlab/react`](https://www.npmjs.com/package/@variantlab/react) — React 18/19 hooks and components
- [`@variantlab/react-native`](https://www.npmjs.com/package/@variantlab/react-native) — React Native + Expo with debug overlay
- [`@variantlab/next`](https://www.npmjs.com/package/@variantlab/next) — Next.js 14/15 SSR + Edge

---

# Config format (`experiments.json`)

The canonical specification for the `experiments.json` file.

## File structure

```json
{
  "$schema": "https://variantlab.dev/schemas/experiments.schema.json",
  "version": 1,
  "signature": "base64url-hmac-optional",
  "enabled": true,
  "experiments": [
    {
      "id": "example",
      "name": "Example experiment",
      "variants": [
        { "id": "a" },
        { "id": "b" }
      ],
      "default": "a"
    }
  ]
}
```

## Top-level fields

| Field | Type | Required | Description |
|---|---|:-:|---|
| `$schema` | string | No | JSON Schema reference for IDE support. Ignored by the engine. |
| `version` | integer | Yes | Schema version. Must be `1`. The engine rejects unknown versions. |
| `signature` | string | No | Base64url-encoded HMAC-SHA256 of the canonical form of `experiments`. Verified via Web Crypto API when an `hmacKey` is configured. |
| `enabled` | boolean | No | Global kill switch. When `false`, all experiments return their default variant. Defaults to `true`. |
| `experiments` | array | Yes | Array of experiment definitions. Max 1000 entries. |

## Experiment fields

| Field | Type | Required | Default | Description |
|---|---|:-:|---|---|
| `id` | string | Yes | — | Unique identifier. `/^[a-z0-9][a-z0-9-]{0,63}$/` |
| `name` | string | Yes | — | Human-readable. Max 128 chars. |
| `description` | string | No | — | Shown in debug overlay. Max 512 chars. |
| `type` | enum | No | `"render"` | `"render"` for component swaps, `"value"` for returned values. |
| `variants` | array | Yes | — | At least 2, at most 100. |
| `default` | string | Yes | — | Must match one of `variants[].id`. |
| `routes` | array | No | — | Glob patterns. Max 100. |
| `targeting` | object | No | — | Targeting predicate. |
| `assignment` | enum | No | `"default"` | Strategy: `default | random | sticky-hash | weighted`. |
| `split` | object | No | — | Traffic split for `weighted` strategy. |
| `mutex` | string | No | — | Mutual exclusion group. |
| `rollback` | object | No | — | Crash-rollback configuration. |
| `status` | enum | No | `"active"` | `draft | active | archived`. |
| `startDate` | ISO 8601 | No | — | Inactive before this. |
| `endDate` | ISO 8601 | No | — | Inactive after this. |
| `owner` | string | No | — | Free text. Max 128 chars. |
| `overridable` | boolean | No | `false` | Whether deep link overrides are accepted. |

### Experiment `id`

Case-sensitive, lowercase. Allowed characters: `a-z`, `0-9`, `-`. Max 64 characters. Must not start with a hyphen.

- `cta-copy` — valid
- `news-card-layout` — valid
- `checkout-v2` — valid
- `CTA_copy` — invalid (uppercase + underscore)
- `-leading-dash` — invalid

### Experiment `type`

- `"render"`: designed for `<Variant>` component-swap usage. Variants don't need a `value`.
- `"value"`: designed for `useVariantValue` usage. Each variant has a `value` field.

### Experiment `default`

Required. Must reference a valid variant ID. Used when:

- Targeting fails
- Kill switch is on
- `startDate` is in the future or `endDate` is in the past
- Engine is in fail-open mode and an error occurs
- Deep link override is not allowed
- Crash rollback has triggered

### Experiment `routes`

Glob patterns matching current route/pathname. Supported patterns:

- Exact: `/`, `/about`
- Wildcard segment: `/blog/*`
- Wildcard deep: `/docs/**`
- Parameter: `/user/:id`
- Trailing-slash insensitive

### Assignment strategies

- `"default"` — always return the default variant. Useful for pre-launch experiments.
- `"random"` — uniform random across variants, assigned once per user and cached.
- `"sticky-hash"` — deterministic hash of `(userId, experimentId)` mapped to a variant. Stable across devices for the same `userId`.
- `"weighted"` — traffic split via `split` field. Uses sticky-hash for determinism.

### Traffic split

Required when `assignment: "weighted"`. Object mapping variant IDs to integer percentages summing to 100.

```json
{
  "id": "pricing",
  "type": "value",
  "default": "low",
  "assignment": "weighted",
  "split": { "control": 50, "treatment-a": 25, "treatment-b": 25 },
  "variants": [
    { "id": "control", "value": 9.99 },
    { "id": "treatment-a", "value": 12.99 },
    { "id": "treatment-b", "value": 14.99 }
  ]
}
```

### Mutex groups

Experiments with the same `mutex` cannot co-run on the same user. When two mutex'd experiments both target a user, the engine picks one by stable hash and excludes the others.

### Experiment `status`

- `"draft"` — visible in debug overlay (with a draft badge), returns default in production
- `"active"` — normal operation
- `"archived"` — hidden from debug overlay, returns default

### Time gates (`startDate` / `endDate`)

ISO 8601 timestamps. Inclusive start, exclusive end. Useful for time-boxed rollouts.

## Variant fields

| Field | Type | Required | Description |
|---|---|:-:|---|
| `id` | string | Yes | Unique within the experiment. Same regex as experiment ID. |
| `label` | string | No | Human-readable. Shown in debug overlay. Max 128 chars. |
| `description` | string | No | Shown in debug overlay. Max 512 chars. |
| `value` | any | No | For `type: "value"` experiments, the value returned by `getVariantValue`. |

### Variant `value`

Any JSON-serializable value. Strings, numbers, booleans, arrays, and objects are all supported. Type safety on the JS/TS side comes via codegen or explicit generic arguments.

## Rollback fields

| Field | Type | Required | Default | Description |
|---|---|:-:|---|---|
| `threshold` | integer | Yes | `3` | Crashes that trigger rollback. 1-100. |
| `window` | integer | Yes | `60000` | Time window in ms. 1000-3600000. |
| `persistent` | boolean | No | `false` | Persist rollback across sessions. |

When enabled, if a variant crashes `threshold` times within `window` milliseconds, the engine:

1. Clears the user's assignment for that experiment
2. Forces the `default` variant
3. Emits an `onRollback` event
4. If `persistent`, stores the rollback in Storage

## Validation rules

The engine validates configs at load time and rejects:

- Unknown version (`version !== 1`)
- Config larger than 1 MB
- Duplicate experiment IDs
- Duplicate variant IDs within an experiment
- `default` that doesn't match any variant
- `split` sum != 100 when assignment is `weighted`
- Invalid route globs (unsupported patterns)
- Invalid semver ranges
- Targeting nesting deeper than 10 levels
- Invalid ISO 8601 timestamps
- Reserved keys (`__proto__`, `constructor`, `prototype`)

Errors are collected and thrown as a `ConfigValidationError` with an `issues` array. In fail-open mode (default), the engine logs the error and falls back to returning defaults. In fail-closed mode, it throws.

## Config examples

### Simple value experiment

```json
{
  "version": 1,
  "experiments": [
    {
      "id": "cta-copy",
      "name": "CTA button copy",
      "type": "value",
      "default": "buy-now",
      "variants": [
        { "id": "buy-now", "value": "Buy now" },
        { "id": "get-started", "value": "Get started" },
        { "id": "try-free", "value": "Try it free" }
      ]
    }
  ]
}
```

### Render experiment with route scope

```json
{
  "version": 1,
  "experiments": [
    {
      "id": "news-card-layout",
      "name": "News card layout",
      "routes": ["/", "/feed"],
      "targeting": { "screenSize": ["small"] },
      "default": "responsive",
      "variants": [
        { "id": "responsive", "label": "Responsive image" },
        { "id": "scale-to-fit", "label": "Scale to fit" },
        { "id": "pip-thumbnail", "label": "PIP thumbnail" }
      ]
    }
  ]
}
```

### Weighted rollout with rollback

```json
{
  "version": 1,
  "experiments": [
    {
      "id": "new-checkout",
      "name": "New checkout flow",
      "assignment": "weighted",
      "split": { "control": 90, "new": 10 },
      "default": "control",
      "variants": [
        { "id": "control" },
        { "id": "new" }
      ],
      "rollback": {
        "threshold": 5,
        "window": 120000,
        "persistent": true
      }
    }
  ]
}
```

### Time-boxed experiment

```json
{
  "version": 1,
  "experiments": [
    {
      "id": "black-friday-banner",
      "name": "Black Friday banner",
      "type": "render",
      "startDate": "2026-11-24T00:00:00Z",
      "endDate": "2026-12-01T00:00:00Z",
      "default": "hidden",
      "variants": [
        { "id": "hidden" },
        { "id": "shown" }
      ]
    }
  ]
}
```

### Targeted beta

```json
{
  "version": 1,
  "experiments": [
    {
      "id": "ai-assistant",
      "name": "AI assistant beta",
      "targeting": {
        "platform": ["ios", "android"],
        "appVersion": ">=2.0.0",
        "attributes": { "betaOptIn": true }
      },
      "default": "disabled",
      "variants": [
        { "id": "disabled" },
        { "id": "enabled" }
      ]
    }
  ]
}
```

---

# Targeting DSL

How targeting predicates work and the semantics of each operator.

## The predicate shape

```ts
interface Targeting {
  platform?: Array<"ios" | "android" | "web" | "node">;
  appVersion?: string;      // semver range
  locale?: string[];        // IETF language tags
  screenSize?: Array<"small" | "medium" | "large">;
  routes?: string[];        // glob patterns
  userId?: string[] | { hash: "sha256"; mod: number };
  attributes?: Record<string, string | number | boolean>;
  predicate?: (context: VariantContext) => boolean; // escape hatch, code-only
}
```

A `Targeting` object is an **implicit AND** of all specified fields. If no fields are specified, the predicate matches every user.

## Evaluation semantics

```
match(targeting, context) =
  platform_match(targeting.platform, context.platform)
    AND appVersion_match(targeting.appVersion, context.appVersion)
    AND locale_match(targeting.locale, context.locale)
    AND screenSize_match(targeting.screenSize, context.screenSize)
    AND routes_match(targeting.routes, context.route)
    AND userId_match(targeting.userId, context.userId)
    AND attributes_match(targeting.attributes, context.attributes)
    AND predicate(context)
```

Each sub-match is:

- **True if the field is not specified in targeting** (open by default)
- **True if the specified predicate matches**
- **False otherwise**

An unspecified field in the context does **not** match a specified targeting field. For example, if `targeting.platform` is `["ios"]` and `context.platform` is `undefined`, the targeting fails.

## Targeting operators

### `platform`

```ts
platform?: Array<"ios" | "android" | "web" | "node">;
```

Set membership. Matches if `context.platform` is in the array.

- `"ios"` — iOS, iPadOS
- `"android"` — Android
- `"web"` — any browser environment (desktop web, mobile web, PWA)
- `"node"` — server-side (SSR, edge runtimes)

### `appVersion`

```ts
appVersion?: string; // semver range
```

Semver range matching. Supported syntax (subset of npm semver):

- Comparators: `=`, `<`, `<=`, `>`, `>=`
- Caret: `^1.2.0` (>= 1.2.0 < 2.0.0)
- Tilde: `~1.2.0` (>= 1.2.0 < 1.3.0)
- Range: `1.2.0 - 2.0.0`
- Compound: `>=1.0.0 <2.0.0`
- OR ranges: `>=1.0.0 <2.0.0 || >=3.0.0`

### `locale`

```ts
locale?: string[]; // IETF language tags
```

Two match modes:

- **Exact**: `"en-US"` matches `"en-US"` only
- **Prefix**: `"en"` matches `"en"`, `"en-US"`, `"en-GB"`, etc.

### `screenSize`

```ts
screenSize?: Array<"small" | "medium" | "large">;
```

Set membership on pre-bucketed screen sizes:

- `"small"`: `max(width, height) < 700 px`
- `"medium"`: `700 <= max(width, height) < 1200 px`
- `"large"`: `max(width, height) >= 1200 px`

Thresholds are configurable at engine creation.

### `routes`

```ts
routes?: string[]; // glob patterns
```

Matches if `context.route` matches any pattern. Supported:

- Exact: `/about`
- Wildcard segment: `/blog/*`
- Wildcard deep: `/docs/**`
- Parameter: `/user/:id`
- Trailing slash insensitive

### `userId`

```ts
userId?: string[] | { hash: "sha256"; mod: number };
```

Two modes:

**Explicit list:**

```json
"userId": ["alice", "bob", "charlie"]
```

Matches if `context.userId` is in the list. Max 10,000 entries.

**Hash bucket:**

```json
"userId": { "hash": "sha256", "mod": 10 }
```

Matches if `sha256(userId) % 100 < mod`. In this example, 10% of users match. Uses Web Crypto API for uniform distribution.

### `attributes`

```ts
attributes?: Record<string, string | number | boolean>;
```

Exact-match predicate on `context.attributes`. Every specified key must match exactly.

```json
"targeting": {
  "attributes": {
    "plan": "premium",
    "region": "us-west",
    "betaOptIn": true
  }
}
```

### The `predicate` escape hatch

```ts
targeting: {
  predicate: (context) => context.daysSinceInstall > 7 && context.isPremium
}
```

The `predicate` field is a function available **only in application code**, never in JSON configs. It is ANDed with the other targeting fields. Use it for complex logic not covered by built-in operators.

## Evaluation order

The engine evaluates predicates in this order for fast short-circuiting:

1. `enabled` kill switch (O(1))
2. `startDate` / `endDate` (O(1))
3. `platform` (O(n), n <= 4)
4. `screenSize` (O(n), n <= 3)
5. `locale` (O(n))
6. `appVersion` (O(n), n = range tokens)
7. `routes` (O(n x m), n = patterns, m = path segments)
8. `attributes` (O(n))
9. `userId` (O(n) for list; O(hash) for bucket)
10. `predicate` (O(?) — unknown, runs last)

## Targeting examples

### Target iOS users on small screens running the latest version

```json
"targeting": {
  "platform": ["ios"],
  "screenSize": ["small"],
  "appVersion": ">=2.0.0"
}
```

### Target 10% of users deterministically

```json
"targeting": {
  "userId": { "hash": "sha256", "mod": 10 }
}
```

### Target premium users in Bengali locale

```json
"targeting": {
  "locale": ["bn"],
  "attributes": { "plan": "premium" }
}
```

### Time-based targeting (application code)

```ts
const targeting = {
  platform: ["ios", "android"],
  predicate: (ctx) => {
    const installDate = new Date(ctx.attributes.installDate as string);
    const daysSinceInstall = (Date.now() - installDate.getTime()) / 86400000;
    return daysSinceInstall >= 7 && daysSinceInstall <= 30;
  }
};
```

---

# API Reference

Complete TypeScript API surface for all packages.

## Core types

```ts
/** Top-level config file shape. */
export interface ExperimentsConfig {
  version: 1;
  signature?: string;
  enabled?: boolean;
  experiments: Experiment[];
}

/** A single experiment definition. */
export interface Experiment {
  id: string;
  name: string;
  description?: string;
  type?: "render" | "value";
  variants: Variant[];
  default: string;
  routes?: string[];
  targeting?: Targeting;
  assignment?: AssignmentStrategy;
  split?: Record<string, number>;
  mutex?: string;
  rollback?: RollbackConfig;
  status?: "draft" | "active" | "archived";
  startDate?: string;
  endDate?: string;
  owner?: string;
}

/** A variant of an experiment. */
export interface Variant {
  id: string;
  label?: string;
  description?: string;
  value?: unknown;
}

/** Runtime context used for targeting and assignment. */
export interface VariantContext {
  userId?: string;
  route?: string;
  platform?: string;
  appVersion?: string;
  locale?: string;
  screenSize?: "small" | "medium" | "large";
  attributes?: Record<string, string | number | boolean>;
}

/** Targeting predicate. All fields are optional; all specified fields must match. */
export interface Targeting {
  platform?: Array<"ios" | "android" | "web" | "node">;
  appVersion?: string;
  locale?: string[];
  screenSize?: Array<"small" | "medium" | "large">;
  routes?: string[];
  userId?: string[] | { hash: string; mod: number };
  attributes?: Record<string, unknown>;
  predicate?: (context: VariantContext) => boolean;
}

/** Assignment strategy. */
export type AssignmentStrategy =
  | "default"       // always return the default variant
  | "random"        // uniform random on first eligibility
  | "sticky-hash"   // deterministic hash of (userId, experimentId)
  | "weighted";     // weighted by split config, sticky-hashed

/** Crash-rollback configuration. */
export interface RollbackConfig {
  threshold: number;
  window: number;
  persistent?: boolean;
}
```

## Engine API

```ts
/** Options passed to createEngine. */
export interface EngineOptions {
  storage: Storage;
  fetcher?: Fetcher;
  telemetry?: Telemetry;
  hmacKey?: Uint8Array | CryptoKey;
  context?: VariantContext;
  errorMode?: "fail-open" | "fail-closed";
  timeTravel?: boolean;
}

/** The runtime engine. */
export class VariantEngine {
  constructor(config: ExperimentsConfig, options: EngineOptions);

  /** Get the current variant ID for an experiment. Synchronous, O(1) after warmup. */
  getVariant(experimentId: string, context?: VariantContext): string;

  /** Get the variant value (for "value" experiments). */
  getVariantValue<T = unknown>(experimentId: string, context?: VariantContext): T;

  /** Force a variant. Used by debug overlay and deep links. */
  setVariant(experimentId: string, variantId: string): void;

  /** Clear a forced variant, falling back to assignment. */
  clearVariant(experimentId: string): void;

  /** Clear all forced variants. */
  resetAll(): void;

  /** Get all experiments, optionally filtered by route. */
  getExperiments(route?: string): Experiment[];

  /** Subscribe to variant changes. Returns unsubscribe function. */
  subscribe(listener: (event: EngineEvent) => void): () => void;

  /** Update runtime context. Triggers re-evaluation of all experiments. */
  updateContext(patch: Partial<VariantContext>): void;

  /** Replace the config (e.g., after a remote fetch). Validates + verifies signature. */
  loadConfig(config: ExperimentsConfig): Promise<void>;

  /** Report a crash for rollback tracking. */
  reportCrash(experimentId: string, error: Error): void;

  /** Track an arbitrary event. Forwarded to telemetry. */
  track(eventName: string, properties?: Record<string, unknown>): void;

  /** Get time-travel history (if enabled). */
  getHistory(): EngineEvent[];

  /** Clean up subscriptions, timers, and listeners. */
  dispose(): void;
}

/** Factory — preferred over `new VariantEngine()`. */
export function createEngine(
  config: ExperimentsConfig,
  options: EngineOptions
): VariantEngine;

/** Events emitted by the engine. */
export type EngineEvent =
  | { type: "ready"; config: ExperimentsConfig }
  | { type: "assignment"; experimentId: string; variantId: string; context: VariantContext }
  | { type: "exposure"; experimentId: string; variantId: string }
  | { type: "variantChanged"; experimentId: string; variantId: string; source: "user" | "system" | "deeplink" | "qr" }
  | { type: "rollback"; experimentId: string; variantId: string; reason: string }
  | { type: "configLoaded"; config: ExperimentsConfig }
  | { type: "error"; error: Error };
```

## Storage interface

```ts
/** Pluggable storage adapter. All methods may be sync or async. */
export interface Storage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
  keys?(): string[] | Promise<string[]>;
}

/** In-memory storage, useful for tests and SSR. */
export function createMemoryStorage(): Storage;
```

Adapter packages provide concrete implementations:

- `@variantlab/react-native` exports `AsyncStorageAdapter`, `MMKVStorageAdapter`, `SecureStoreAdapter`
- `@variantlab/react` exports `LocalStorageAdapter`, `SessionStorageAdapter`, `CookieStorageAdapter`
- `@variantlab/next` exports `NextCookieAdapter` (SSR-aware)

## Fetcher interface

```ts
/** Optional remote config fetcher. */
export interface Fetcher {
  fetch(): Promise<ExperimentsConfig>;
  pollInterval?: number;
}

/** Simple HTTP fetcher helper. */
export function createHttpFetcher(options: {
  url: string;
  headers?: Record<string, string>;
  pollInterval?: number;
  signal?: AbortSignal;
}): Fetcher;
```

## Telemetry interface

```ts
/** Optional telemetry sink. Called for every engine event. */
export interface Telemetry {
  track(event: EngineEvent): void;
}

/** Helper to combine multiple telemetry sinks. */
export function combineTelemetry(...sinks: Telemetry[]): Telemetry;
```

## Targeting API

```ts
/** Evaluate a targeting predicate against a context. */
export function evaluate(
  targeting: EvaluableTargeting,
  context: VariantContext | EvalContext,
): TargetingResult;

/** Thin wrapper returning evaluate(...).matched. */
export function matchTargeting(
  targeting: EvaluableTargeting,
  context: VariantContext | EvalContext,
): boolean;

/** Walk an experiment's targeting and return a full trace. */
export function explain(
  experiment: Experiment,
  context: VariantContext | EvalContext,
): ExplainResult;

/** Match a route pattern. Supports /foo, /foo/*, /foo/**, /user/:id. */
export function matchRoute(pattern: string, route: string): boolean;

/** Match a semver range. Supports >=1.2.0, ^1.2.0, 1.2.0 - 2.0.0. */
export function matchSemver(range: string, version: string): boolean;

/** Compute a sha256 bucket (0..99) for a userId. Async (Web Crypto). */
export function hashUserId(userId: string): Promise<number>;
```

## Assignment API

```ts
/** Deterministic hash of (userId + experimentId) to a [0, 1) float. */
export function stickyHash(userId: string, experimentId: string): number;

/** Evaluate an assignment strategy. */
export function assignVariant(
  experiment: Experiment,
  context: VariantContext
): string;
```

## Errors

```ts
/** A single validation issue surfaced by validateConfig. */
export interface ConfigIssue {
  readonly path: string;    // RFC 6901 JSON Pointer
  readonly code: IssueCode; // machine-readable
  readonly message: string; // human-readable
}

/** Thrown when config validation fails. */
export class ConfigValidationError extends Error {
  readonly issues: ReadonlyArray<ConfigIssue>;
}

/** Thrown when HMAC verification fails. */
export class SignatureVerificationError extends Error {}

/** Thrown when an experiment ID is unknown (fail-closed mode). */
export class UnknownExperimentError extends Error {
  readonly experimentId: string;
}
```

## React API (`@variantlab/react`)

### Provider

```tsx
export interface VariantLabProviderProps {
  config: ExperimentsConfig;
  options?: Omit<EngineOptions, "storage"> & { storage?: Storage };
  context?: Partial<VariantContext>;
  children: React.ReactNode;
}

export const VariantLabProvider: React.FC<VariantLabProviderProps>;
```

### Hooks

```ts
/** Returns the current variant ID for an experiment. */
export function useVariant(experimentId: string): string;

/** Returns the variant value (for "value" experiments). */
export function useVariantValue<T = unknown>(experimentId: string): T;

/** Returns { variant, value, track }. */
export function useExperiment<T = unknown>(experimentId: string): {
  variant: string;
  value: T;
  track: (eventName: string, properties?: Record<string, unknown>) => void;
};

/** Imperative variant setter. Dev-only by default. */
export function useSetVariant(): (experimentId: string, variantId: string) => void;

/** Low-level engine access. */
export function useVariantLabEngine(): VariantEngine;

/** Returns experiments applicable to the current route. */
export function useRouteExperiments(route?: string): Experiment[];
```

### Components

```tsx
/** Render-prop switch for "render" experiments. */
export const Variant: React.FC<{
  experimentId: string;
  children: Record<string, React.ReactNode>;
  fallback?: React.ReactNode;
}>;

/** Render-prop for "value" experiments. */
export function VariantValue<T>(props: {
  experimentId: string;
  children: (value: T) => React.ReactNode;
}): React.ReactElement;

/** Error boundary that reports crashes to the engine. */
export const VariantErrorBoundary: React.ComponentType<{
  experimentId: string;
  fallback?: React.ReactNode | ((error: Error) => React.ReactNode);
  children: React.ReactNode;
}>;
```

## React Native API (`@variantlab/react-native`)

Re-exports everything from `@variantlab/react` plus:

### Storage adapters

```ts
export function createAsyncStorageAdapter(): Storage;
export function createMMKVStorageAdapter(): Storage;
export function createSecureStoreAdapter(): Storage;
```

### Debug overlay (React Native — `@variantlab/react-native/debug`)

```tsx
export const VariantDebugOverlay: React.FC<{
  forceEnable?: boolean;
  routeFilter?: boolean;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  hideButton?: boolean;
}>;

export function openDebugOverlay(): void;
export function closeDebugOverlay(): void;
```

### Debug overlay (React Web — `@variantlab/react/debug`)

```tsx
export const VariantDebugOverlay: React.FC<{
  forceEnable?: boolean;
  routeFilter?: boolean;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  hideButton?: boolean;
  theme?: Partial<OverlayTheme>;
  offset?: { x: number; y: number };
}>;

export function openDebugOverlay(): void;
export function closeDebugOverlay(): void;
```

Also re-exported from `@variantlab/next/debug` with `"use client"` directive.

### Deep link handler

```ts
export function registerDeepLinkHandler(
  engine: VariantEngine,
  options?: { scheme?: string; host?: string }
): () => void;
```

## Next.js API (`@variantlab/next`)

### Server

```ts
export function createVariantLabServer(
  config: ExperimentsConfig,
  options?: Omit<EngineOptions, "storage"> & { storage?: Storage }
): VariantEngine;

export function getVariantSSR(
  experimentId: string,
  request: Request | NextApiRequest,
  config: ExperimentsConfig
): string;

export function getVariantValueSSR<T = unknown>(
  experimentId: string,
  request: Request | NextApiRequest,
  config: ExperimentsConfig
): T;
```

### Middleware

```ts
export function variantLabMiddleware(config: ExperimentsConfig): (
  req: NextRequest
) => NextResponse;
```

## CLI commands

```
variantlab init                         Scaffold experiments.json + install adapter
variantlab generate [--out <path>]      Generate .d.ts from experiments.json
variantlab validate [--config <path>]   Validate config + check for orphaned IDs
variantlab eval <experiment> [context]  Evaluate a single experiment with a context
```

---

# Architecture

## Design goals

1. **Core runs anywhere.** Any ECMAScript 2020 environment — Node 18+, Deno, Bun, browsers, React Native Hermes, Cloudflare Workers, Vercel Edge, AWS Lambda@Edge.
2. **Adapters are trivially small.** Each framework adapter is < 200 source LOC and < 2 KB gzipped.
3. **Tree-shakeable everything.** Every export lives in its own module file. Unused code is eliminated at build time.
4. **No implicit IO.** Core never reads from disk, network, or global storage. All IO happens through injected adapters (Storage, Fetcher, Telemetry).
5. **Deterministic at hash boundaries.** Same `userId` + experiment = same variant across every runtime.
6. **Forward-compatible config schema.** `experiments.json` has a `version` field. The engine refuses unknown versions.

## Runtime data flow

```
+-------------------------------------------------------------------+
|                   Application code (framework)                     |
|                                                                    |
|   useVariant("x")     <Variant experimentId="x">    track(...)    |
+---------+------------------------+------------------------+--------+
          |                        |                        |
+---------v------------------------v------------------------v--------+
|                       Framework adapter                            |
|                  (@variantlab/react, /next, ...)                    |
|                                                                    |
|   React Context  |  Hooks  |  SSR helpers  |  Debug overlay        |
+---------+----------------------------------------------------------+
          |
          |  subscribe / getVariant / setVariant / trackEvent
          |
+---------v----------------------------------------------------------+
|                      @variantlab/core                              |
|                                                                    |
|  +------------+  +------------+  +------------+  +----------+      |
|  |  Engine    |--|  Targeting |--| Assignment |--|  Schema  |      |
|  |            |  |            |  |            |  | validator|      |
|  +-----+------+  +------------+  +------------+  +----------+      |
|        |                                                           |
|  +-----v------+  +------------+  +------------+  +----------+      |
|  |  Storage   |  |  Fetcher   |  |  Telemetry |  |  Crypto  |      |
|  | (injected) |  | (injected) |  | (injected) |  | (WebAPI) |      |
|  +------------+  +------------+  +------------+  +----------+      |
+--------------------------------------------------------------------+
```

### Resolve variant (hot path)

Called on every `getVariant()` read. Must be O(1).

1. Engine checks in-memory override map (dev/debug overrides win)
2. Engine checks Storage for a persisted assignment
3. If none, engine evaluates targeting predicates against `context`
4. If targeting passes, engine runs the assignment strategy
5. Engine writes the result to Storage and memoizes
6. Engine emits an `onAssignment` event to Telemetry (first time only per session)
7. Returns variant ID

### Load config (cold start)

1. App mounts provider with inline config or async `Fetcher`
2. Engine validates config (hand-rolled validator, no zod)
3. If HMAC signature is present, engine verifies via Web Crypto
4. Engine hydrates Storage — reads all previously persisted assignments
5. Engine emits `onReady` event

### Override flow (dev / QA)

1. User taps a variant in debug overlay, or deep link fires, or QR is scanned
2. Adapter calls `engine.setVariant(experimentId, variantId)`
3. Engine writes override to Storage with priority flag
4. Engine emits `onVariantChanged`
5. All subscribed components re-render via `useSyncExternalStore`

### Crash rollback flow

1. `<VariantErrorBoundary>` catches an error
2. Adapter calls `engine.reportCrash(experimentId, error)`
3. Engine increments crash counter in Storage
4. If counter exceeds threshold within window, engine forces the default variant and emits `onRollback`

## Package boundaries

| Package | Size budget (gzip) | Runtime deps | Description |
|---|---:|---|---|
| `@variantlab/core` | **3.0 KB** | 0 | Engine, targeting, assignment |
| `@variantlab/react` | **1.5 KB** | core | React 18/19 hooks + components |
| `@variantlab/react-native` | **4.0 KB** | core, react | RN bindings + debug overlay |
| `@variantlab/next` | **2.0 KB** | core, react | Next.js 14/15 SSR + Edge |
| `@variantlab/cli` | — | core | CLI tool (dev dependency) |

## Build tooling

| Tool | Purpose |
|---|---|
| **pnpm** | Package manager + workspace |
| **tsup** | Bundle (ESM+CJS+DTS via esbuild) |
| **TypeScript 5.6+** | Type checking (strict mode) |
| **Vitest** | Unit + integration tests |
| **size-limit** | Bundle size enforcement in CI |
| **Changesets** | Per-package semver versioning |
| **Biome** | Lint + format (30x faster than ESLint) |

## Dependency policy

- **Core**: zero runtime dependencies, forever. Enforced by CI.
- **Adapters**: `@variantlab/core` only. Everything else is peer.
- Every runtime dependency is a supply-chain attack vector. By refusing all runtime deps in core, the audit surface is our own code.

---

# Design principles

The 8 principles that govern every design decision in variantlab.

### 1. Framework-agnostic core, thin adapters

The engine runs in any ECMAScript environment. Every framework binding is a thin wrapper (< 200 LOC). `@variantlab/core` never imports `react`, `vue`, `svelte`, or any framework.

### 2. Zero runtime dependencies

`@variantlab/core` has zero runtime dependencies. We hand-roll our schema validator (400 bytes vs zod's 12 KB), semver matcher (250 bytes vs `semver`'s 6 KB), route glob matcher (150 bytes vs `minimatch`'s 4 KB), and hash function (80 bytes vs `murmurhash`'s 500 bytes).

### 3. ESM-first, tree-shakeable, edge-compatible

All packages ship ES modules with `"sideEffects": false`. ES2020 target. Dual ESM+CJS output. No Node built-ins in core. Runs in Node 18+, Deno, Bun, browsers, React Native Hermes, Cloudflare Workers, Vercel Edge, AWS Lambda@Edge.

### 4. Security by construction

No `eval`, no `Function()`, no dynamic `import()` on config data. Prototype pollution blocked via `Object.create(null)` and key allow-lists. Constant-time HMAC via Web Crypto. Hard limits on config size, nesting, and iteration. Config frozen after load via `Object.freeze`.

### 5. Declarative JSON as the contract

`experiments.json` is the single source of truth. JSON configs are version-controllable, reviewable, toolable, portable, and safe.

### 6. SSR correct everywhere

The engine is deterministic. Same config + context = same variant, every time. No `Math.random()` in hot paths. No hydration mismatches in Next.js App Router, Remix, SvelteKit, SolidStart, or Nuxt.

### 7. Privacy by default

Zero data collection. No phone-home on import. No analytics, error tracking, or usage stats. Every network call is explicit and user-provided. GDPR/CCPA/LGPD compliant out of the box.

### 8. Docs-first development

Every public API is specified in markdown before code is written. `API.md` is authoritative. Features have specs before implementation. Every phase has a plan with exit criteria.

### Priority order when principles conflict

Security > Privacy > Zero-dependency > SSR correctness > Framework-agnostic > Bundle size

---

# Security

## Threat model

| Threat | Description | Mitigation |
|---|---|---|
| **Malicious remote config** | Compromised CDN injects bad variants | Optional HMAC-SHA256 signed configs. Verify with Web Crypto before applying. |
| **Tampered local storage** | Malicious app writes arbitrary keys | Stored variants validated against config. Unknown IDs discarded. |
| **Config-based XSS** | Executable code in config | No `eval`, no `Function()`, no dynamic `import()` on config data. |
| **Prototype pollution** | Crafted JSON with `__proto__` keys | `Object.create(null)` for parsed objects. Reserved keys rejected. |
| **Large/malicious config DoS** | Exponential patterns, huge arrays | Hard limits: 1 MB config, 100 variants, 1000 experiments, depth 10. |
| **HMAC timing attack** | Observe timing to guess bytes | `crypto.subtle.verify` is constant-time by spec. |
| **Supply chain attack** | Compromised npm package | Zero runtime deps in core. Signed releases via provenance + Sigstore. |
| **Debug overlay in production** | End users see internal debug UI | Overlay tree-shaken in production. Throws unless `NODE_ENV === "development"`. |
| **Deep link abuse** | Force users into broken variants | Deep links off by default. Only `overridable: true` experiments. Session-scoped. |
| **Storage key collision** | Another library writes same keys | All keys prefixed with `variantlab:v1:`. Corrupted values discarded. |

## Security commitments

1. **Never add telemetry** that reports to a server we control.
2. **Never add auto-update** mechanisms that fetch new code at runtime.
3. **Never phone home** on import. The engine does nothing on module load.
4. **Publish a full SBOM** with every release.
5. **Sign every release** via Sigstore and npm provenance.
6. **Respond to security reports within 48 hours.**

## Privacy commitments

1. Zero data collection about users, developers, or their apps.
2. Zero network requests on its own. Every call from user-provided adapters.
3. GDPR / CCPA / LGPD compliant out of the box — no data to collect.
4. User IDs hashed client-side before any network call.
5. Debug overlay state stored locally only.

## CSP compatibility

Works under the most restrictive Content Security Policies:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'
```

No inline scripts, no inline styles, no `unsafe-eval`, no `unsafe-inline`.

## Reporting a vulnerability

**Do not file public GitHub issues for security vulnerabilities.**

Use GitHub Security Advisories or email `security@variantlab.dev`.

We will:
1. Acknowledge receipt within 48 hours
2. Provide initial assessment within 7 days
3. Follow a 90-day coordinated disclosure window

---

# Roadmap

## Phase 1: MVP (v0.1) — Complete

- `@variantlab/core` — engine, targeting, assignment
- `@variantlab/react` — hooks, components
- `@variantlab/react-native` — RN bindings, storage adapters, debug overlay
- `@variantlab/next` — App Router + Pages Router SSR
- `@variantlab/cli` — `init`, `generate`, `validate`, `eval`

## Phase 2: Expansion (v0.2)

- `@variantlab/remix` — Remix loaders, actions, cookie stickiness
- `@variantlab/vue` — Vue 3 composables + components
- `@variantlab/vanilla` — plain JS/TS helpers
- `@variantlab/devtools` — Chrome/Firefox browser extension
- ~~React web `VariantDebugOverlay`~~ — **Done** (available in `@variantlab/react/debug` and `@variantlab/next/debug`)

## Phase 3: Ecosystem (v0.3)

- `@variantlab/svelte` — Svelte 5 stores + SvelteKit
- `@variantlab/solid` — SolidJS signals + SolidStart
- `@variantlab/astro` — Astro integration
- `@variantlab/nuxt` — Nuxt module
- `@variantlab/storybook` — Storybook 8 addon
- `@variantlab/eslint-plugin` — lint rules
- `@variantlab/test-utils` — Jest/Vitest/Playwright helpers

## Phase 4: Advanced (v0.4)

- HMAC signing GA with CLI tooling
- Crash-triggered rollback GA
- Time-travel debugger
- QR code state sharing
- Multivariate crossed experiments
- Holdout groups
- Mutual exclusion groups GA

## Phase 5: v1.0 Stable

- API freeze with semver strict
- Third-party security audit
- Reproducible builds
- Long-term support policy
- Migration guides from Firebase Remote Config, GrowthBook, Statsig, LaunchDarkly

## Versioning commitments

| Version range | Stability | Breaking changes |
|---|---|---|
| 0.0.x | Experimental | Any time |
| 0.1.x - 0.4.x | Beta | Minor versions can break |
| 0.5.x - 0.9.x | Release candidate | Patch only for security |
| 1.0.0+ | Stable | Semver strict — major version required |

---

## License

[MIT](./LICENSE)
