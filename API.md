# API Reference

Complete TypeScript API surface for all packages. This is the source of truth during Phase 0 — any PR that changes an API must update this file first.

## Table of contents

- [@variantlab/core](#variantlabcore)
  - [Types](#types)
  - [Engine](#engine)
  - [Storage interface](#storage-interface)
  - [Fetcher interface](#fetcher-interface)
  - [Telemetry interface](#telemetry-interface)
  - [Targeting](#targeting)
  - [Assignment strategies](#assignment-strategies)
  - [Errors](#errors)
- [@variantlab/react](#variantlabreact)
- [@variantlab/react-native](#variantlabreact-native)
- [@variantlab/next](#variantlabnext)
- [@variantlab/cli](#variantlabcli)

---

## `@variantlab/core`

### Types

```ts
/** Top-level config file shape. */
export interface ExperimentsConfig {
  /** Schema version. Current is 1. */
  version: 1;
  /** Optional HMAC signature for remote configs. Verified via Web Crypto. */
  signature?: string;
  /** Optional global kill switch. When false, all experiments return defaults. */
  enabled?: boolean;
  /** The experiments. */
  experiments: Experiment[];
}

/** A single experiment definition. */
export interface Experiment {
  /** Unique identifier. Must match /^[a-z0-9-]+$/. */
  id: string;
  /** Human-readable name for the debug overlay. */
  name: string;
  /** Human-readable description. Shown in debug overlay. */
  description?: string;
  /** "render" swaps components; "value" returns primitive values. */
  type?: "render" | "value";
  /** The variants to test. Must have at least 2. */
  variants: Variant[];
  /** Default variant ID. Must match one of variants[].id. */
  default: string;
  /** Routes this experiment applies to. Glob patterns. */
  routes?: string[];
  /** Targeting predicates. ALL must match for a user to be eligible. */
  targeting?: Targeting;
  /** Assignment strategy. Defaults to "default". */
  assignment?: AssignmentStrategy;
  /** Traffic split (for "weighted" strategy). */
  split?: Record<string, number>;
  /** Mutual exclusion group. Experiments in the same group cannot co-run. */
  mutex?: string;
  /** Enable crash-triggered rollback for this experiment. */
  rollback?: RollbackConfig;
  /** Lifecycle state. Archived experiments are hidden from debug overlay. */
  status?: "draft" | "active" | "archived";
  /** Start date (ISO 8601). Experiment inactive before this. */
  startDate?: string;
  /** End date (ISO 8601). Experiment inactive after this. */
  endDate?: string;
  /** Owner, for tracking. Free text. */
  owner?: string;
}

/** A variant of an experiment. */
export interface Variant {
  /** Unique within the experiment. Must match /^[a-z0-9-]+$/. */
  id: string;
  /** Human-readable label for debug overlay. */
  label?: string;
  /** Human-readable description. */
  description?: string;
  /** For "value" experiments, the value returned by useVariantValue. */
  value?: unknown;
}

/** Runtime context used for targeting and assignment. */
export interface VariantContext {
  /** Stable user identifier for sticky assignment. */
  userId?: string;
  /** Current route / pathname. */
  route?: string;
  /** Platform: "ios" | "android" | "web" | "node". */
  platform?: string;
  /** Semver string. */
  appVersion?: string;
  /** IETF language tag. */
  locale?: string;
  /** Screen size bucket, derived automatically by adapters. */
  screenSize?: "small" | "medium" | "large";
  /** Arbitrary user attributes for custom targeting. */
  attributes?: Record<string, string | number | boolean>;
}

/** Targeting predicate. All fields are optional; all specified fields must match. */
export interface Targeting {
  platform?: Array<"ios" | "android" | "web" | "node">;
  appVersion?: string; // semver range, e.g. ">=1.2.0 <2.0.0"
  locale?: string[];
  screenSize?: Array<"small" | "medium" | "large">;
  routes?: string[]; // glob patterns
  userId?: string[] | { hash: string; mod: number }; // explicit list or hash bucket
  attributes?: Record<string, unknown>; // exact match
  predicate?: (context: VariantContext) => boolean; // escape hatch
}

/** Assignment strategy. */
export type AssignmentStrategy =
  | "default"       // always return the default variant
  | "random"        // uniform random on first eligibility
  | "sticky-hash"   // deterministic hash of (userId, experimentId)
  | "weighted";     // weighted by split config, sticky-hashed

/** Crash-rollback configuration. */
export interface RollbackConfig {
  /** Number of crashes that trigger rollback. Default: 3. */
  threshold: number;
  /** Time window in milliseconds. Default: 60000. */
  window: number;
  /** Whether to persist the rollback across sessions. Default: false. */
  persistent?: boolean;
}
```

### Engine

```ts
/** Options passed to createEngine. */
export interface EngineOptions {
  /** Storage adapter. Required. */
  storage: Storage;
  /** Optional remote config fetcher. */
  fetcher?: Fetcher;
  /** Optional telemetry sink. */
  telemetry?: Telemetry;
  /** Optional HMAC verification key (raw bytes or CryptoKey). */
  hmacKey?: Uint8Array | CryptoKey;
  /** Initial runtime context. */
  context?: VariantContext;
  /** Fail-open (return defaults) or fail-closed (throw) on errors. Default: fail-open. */
  errorMode?: "fail-open" | "fail-closed";
  /** Enable time-travel recording. Default: false. */
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

  /** Subscribe to variant changes. Used by framework adapters. */
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

### Storage interface

```ts
/** Pluggable storage adapter. All methods may be sync or async. */
export interface Storage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
  /** Optional: returns all keys with the variantlab prefix. */
  keys?(): string[] | Promise<string[]>;
}

/** In-memory storage, useful for tests and SSR. */
export function createMemoryStorage(): Storage;
```

Adapter packages provide concrete implementations:

- `@variantlab/react-native` exports `AsyncStorageAdapter`, `MMKVStorageAdapter`, `SecureStoreAdapter`
- `@variantlab/react` exports `LocalStorageAdapter`, `SessionStorageAdapter`, `CookieStorageAdapter`
- `@variantlab/next` exports `NextCookieAdapter` (SSR-aware)

### Fetcher interface

```ts
/** Optional remote config fetcher. */
export interface Fetcher {
  /** Fetch the latest config. May throw on network failure. */
  fetch(): Promise<ExperimentsConfig>;
  /** Polling interval in ms. Default: 0 (no polling). */
  pollInterval?: number;
}

/** Simple HTTP fetcher helper. */
export function createHttpFetcher(options: {
  url: string;
  headers?: Record<string, string>;
  pollInterval?: number;
  /** Signal for abort. */
  signal?: AbortSignal;
}): Fetcher;
```

### Telemetry interface

```ts
/** Optional telemetry sink. Called for every engine event. */
export interface Telemetry {
  track(event: EngineEvent): void;
}

/** Helper to combine multiple telemetry sinks. */
export function combineTelemetry(...sinks: Telemetry[]): Telemetry;
```

### Targeting

```ts
/** Evaluate a targeting predicate against a context. Pure, synchronous. */
export function matchTargeting(targeting: Targeting, context: VariantContext): boolean;

/** Match a route pattern. Supports `/foo`, `/foo/*`, `/foo/**`. */
export function matchRoute(pattern: string, route: string): boolean;

/** Match a semver range. Supports `>=1.2.0`, `^1.2.0`, `1.2.0 - 2.0.0`. */
export function matchSemver(range: string, version: string): boolean;
```

### Assignment strategies

```ts
/** Deterministic hash of (userId + experimentId) to a [0, 1) float. */
export function stickyHash(userId: string, experimentId: string): number;

/** Evaluate an assignment strategy. */
export function assignVariant(
  experiment: Experiment,
  context: VariantContext
): string;
```

### Errors

```ts
/** A single validation issue surfaced by `validateConfig`. */
export interface ConfigIssue {
  /** RFC 6901 JSON Pointer into the source config. "" for root. */
  readonly path: string;
  /** Machine-readable code for programmatic handling (CLI, debug overlay). */
  readonly code: IssueCode;
  /** Human-readable message safe for CLI output. */
  readonly message: string;
}

/** Union of all validation issue codes.
 *  Narrow union in the implementation — see `packages/core/src/config/codes.ts`. */
export type IssueCode = string;

/** Thrown when config validation fails. Collects all issues before throwing. */
export class ConfigValidationError extends Error {
  readonly issues: ReadonlyArray<ConfigIssue>;
}

/** Thrown when HMAC verification fails. */
export class SignatureVerificationError extends Error {}

/** Thrown when an experiment ID is unknown. Only in fail-closed mode. */
export class UnknownExperimentError extends Error {
  readonly experimentId: string;
}
```

---

## `@variantlab/react`

### Provider

```tsx
export interface VariantLabProviderProps {
  /** The experiments config. Inline JSON or from a fetcher. */
  config: ExperimentsConfig;
  /** Engine options. */
  options?: Omit<EngineOptions, "storage"> & { storage?: Storage };
  /** Runtime context. Defaults to auto-detect (platform, locale, screen size). */
  context?: Partial<VariantContext>;
  /** Children. */
  children: React.ReactNode;
}

export const VariantLabProvider: React.FC<VariantLabProviderProps>;
```

### Hooks

```ts
/** Returns the current variant ID for an experiment. */
export function useVariant<K extends keyof GeneratedExperiments = string>(
  experimentId: K
): GeneratedExperiments[K]["variants"] | string;

/** Returns the variant value (for "value" experiments). */
export function useVariantValue<T = unknown>(
  experimentId: string
): T;

/** Returns an object with the variant, value, and event trackers. */
export function useExperiment<T = unknown>(
  experimentId: string
): {
  variant: string;
  value: T;
  track: (eventName: string, properties?: Record<string, unknown>) => void;
};

/** Imperative variant setter. Dev-only by default. */
export function useSetVariant(): (
  experimentId: string,
  variantId: string
) => void;

/** Low-level engine access. */
export function useVariantLabEngine(): VariantEngine;

/** Returns the list of experiments applicable to the current route. */
export function useRouteExperiments(route?: string): Experiment[];
```

### Components

```tsx
/** Render-prop switch for "render" experiments. */
export interface VariantProps {
  experimentId: string;
  children: Record<string, React.ReactNode>;
  fallback?: React.ReactNode;
}
export const Variant: React.FC<VariantProps>;

/** Render-prop for "value" experiments. */
export interface VariantValueProps<T> {
  experimentId: string;
  children: (value: T) => React.ReactNode;
}
export function VariantValue<T>(props: VariantValueProps<T>): React.ReactElement;

/** Error boundary that reports crashes to the engine. */
export interface VariantErrorBoundaryProps {
  experimentId: string;
  fallback?: React.ReactNode | ((error: Error) => React.ReactNode);
  children: React.ReactNode;
}
export const VariantErrorBoundary: React.ComponentType<VariantErrorBoundaryProps>;

/** Debug overlay. Tree-shaken in production. */
export const VariantDebugOverlay: React.FC<{
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  routeFilter?: boolean;
}>;
```

---

## `@variantlab/react-native`

Re-exports everything from `@variantlab/react` plus:

### Storage adapters

```ts
/** AsyncStorage-backed storage. Requires @react-native-async-storage/async-storage. */
export function createAsyncStorageAdapter(): Storage;

/** MMKV-backed storage. Requires react-native-mmkv. */
export function createMMKVStorageAdapter(): Storage;

/** Expo SecureStore-backed storage. Requires expo-secure-store. */
export function createSecureStoreAdapter(): Storage;
```

### Debug overlay (RN-specific)

```tsx
/** Native debug overlay with floating button, bottom sheet, QR share, shake-to-open. */
export const VariantDebugOverlay: React.FC<{
  /** Enable shake-to-open gesture. Default: true. */
  shakeToOpen?: boolean;
  /** Show only experiments matching the current route. Default: true. */
  routeFilter?: boolean;
  /** Button position. */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Hide button entirely; open only via shake or programmatic trigger. */
  hideButton?: boolean;
}>;

/** Imperatively open the debug overlay. */
export function openDebugOverlay(): void;
```

### Deep link handler

```ts
/** Registers a listener for variantlab:// deep links. Returns unsubscribe. */
export function registerDeepLinkHandler(
  engine: VariantEngine,
  options?: { scheme?: string; host?: string }
): () => void;
```

### Auto-detected context

```ts
/** Returns a VariantContext filled with platform, screenSize, locale. */
export function getAutoContext(): VariantContext;
```

---

## `@variantlab/next`

### Server

```ts
/** Create an engine for server-side use. Singleton per request or per process. */
export function createVariantLabServer(
  config: ExperimentsConfig,
  options?: Omit<EngineOptions, "storage"> & { storage?: Storage }
): VariantEngine;

/** Read a variant from a Next.js request (App Router or Pages Router). */
export function getVariantSSR(
  experimentId: string,
  request: Request | NextApiRequest,
  config: ExperimentsConfig
): string;

/** Read a variant value from a Next.js request. */
export function getVariantValueSSR<T = unknown>(
  experimentId: string,
  request: Request | NextApiRequest,
  config: ExperimentsConfig
): T;
```

### Middleware

```ts
/** Next.js middleware that assigns a sticky cookie for variant stability. */
export function variantLabMiddleware(config: ExperimentsConfig): (
  req: NextRequest
) => NextResponse;
```

### Client (re-exports from `@variantlab/react`)

```tsx
export {
  VariantLabProvider,
  useVariant,
  useVariantValue,
  useExperiment,
  Variant,
  VariantValue,
  VariantErrorBoundary,
  VariantDebugOverlay,
} from "@variantlab/react";
```

### App Router usage

```tsx
// app/layout.tsx
import { cookies } from "next/headers";
import { VariantLabProvider } from "@variantlab/next/client";
import experiments from "./experiments.json";

export default function RootLayout({ children }) {
  const initialVariants = /* read from cookies */;
  return (
    <VariantLabProvider config={experiments} initialVariants={initialVariants}>
      {children}
    </VariantLabProvider>
  );
}

// middleware.ts
import { variantLabMiddleware } from "@variantlab/next/middleware";
import experiments from "./experiments.json";

export default variantLabMiddleware(experiments);
```

---

## `@variantlab/cli`

### Commands

```
variantlab init                         Scaffold experiments.json + install adapter
variantlab generate [--out <path>]      Generate .d.ts from experiments.json
variantlab validate [--config <path>]   Validate config + check for orphaned IDs
variantlab scaffold <experimentId>      Scaffold boilerplate for a new experiment
variantlab sign --key <path>            HMAC-sign an experiments.json
variantlab verify --key <path>          Verify an HMAC-signed experiments.json
```

### `variantlab generate`

Reads `experiments.json` (or path from `--config`) and writes a `.d.ts` with:

- A `GeneratedExperiments` interface mapping IDs to literal union types for variant IDs
- Module augmentation that narrows `useVariant(id)` returns
- JSDoc with experiment names and descriptions for IDE tooltips

Example output:

```ts
// variantlab-generated.d.ts (DO NOT EDIT)

declare module "@variantlab/core" {
  interface GeneratedExperiments {
    /** CTA button copy */
    "cta-copy": {
      variants: "buy-now" | "get-started" | "try-free";
      value: string;
    };
    /** News card layout */
    "news-card-layout": {
      variants: "responsive" | "scale-to-fit" | "pip-thumbnail";
      value: never;
    };
  }
}

export {};
```

---

## API stability

Everything above is **proposed, not implemented**. During Phase 0 any signature in this file may change in response to design review. The goal is to lock it before Phase 1 begins.

PRs that change public APIs must:

1. Update this file first
2. Include a changeset describing the change
3. Link to a GitHub discussion for non-trivial changes
4. Provide a migration guide if breaking
