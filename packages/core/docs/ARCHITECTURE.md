# Architecture

This document describes the monorepo layout, build tooling, runtime architecture, data flow, and size budgets for variantlab.

## Table of contents

- [Design goals](#design-goals)
- [Monorepo layout](#monorepo-layout)
- [Package boundaries](#package-boundaries)
- [Runtime data flow](#runtime-data-flow)
- [Build tooling](#build-tooling)
- [Size budgets](#size-budgets)
- [Dependency policy](#dependency-policy)
- [Versioning and release strategy](#versioning-and-release-strategy)
- [Testing strategy](#testing-strategy)
- [CI/CD pipeline](#cicd-pipeline)

---

## Design goals

1. **Core runs anywhere.** Any ECMAScript 2020 environment — Node 18+, Deno, Bun, browsers, React Native Hermes, Cloudflare Workers, Vercel Edge, AWS Lambda@Edge. Zero platform APIs in core.
2. **Adapters are trivially small.** Each framework adapter should be < 200 source LOC and < 2 KB gzipped.
3. **Tree-shakeable everything.** Every export lives in its own module file. Unused code is eliminated at build time.
4. **No implicit IO.** Core never reads from disk, network, or global storage on its own. All IO happens through injected adapters (Storage, Fetcher, Telemetry).
5. **Deterministic at hash boundaries.** User bucketing uses a stable hash. The same `userId` + experiment produces the same variant across every machine, every runtime, every language.
6. **Forward-compatible config schema.** `experiments.json` has a `version` field. The engine refuses to load a config from a newer major version, warns on a newer minor, and upgrades older configs in memory.

---

## Monorepo layout

```
variantlab/
├── README.md
├── ARCHITECTURE.md
├── API.md
├── SECURITY.md
├── ROADMAP.md
├── LICENSE
├── CONTRIBUTING.md
├── experiments.schema.json
├── package.json                   # pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .changeset/                    # changesets for versioning
├── .github/
│   └── workflows/
│       ├── ci.yml                 # lint, test, size-limit
│       ├── release.yml            # changesets publish
│       ├── sigstore.yml           # sigstore signing
│       └── compat-matrix.yml      # test against Node 18/20/22, React 18/19
├── docs/
│   ├── research/
│   ├── design/
│   ├── features/
│   ├── phases/
│   └── adapters/
├── packages/
│   ├── core/                      # @variantlab/core
│   │   ├── src/
│   │   │   ├── engine.ts
│   │   │   ├── types.ts
│   │   │   ├── storage.ts
│   │   │   ├── targeting.ts
│   │   │   ├── assignment.ts
│   │   │   ├── hash.ts
│   │   │   ├── schema.ts
│   │   │   ├── crypto.ts
│   │   │   ├── errors.ts
│   │   │   └── index.ts
│   │   ├── test/
│   │   ├── package.json
│   │   └── tsup.config.ts
│   ├── react/                     # @variantlab/react
│   ├── react-native/              # @variantlab/react-native
│   ├── next/                      # @variantlab/next
│   ├── remix/                     # @variantlab/remix        (phase 2)
│   ├── vue/                       # @variantlab/vue          (phase 2)
│   ├── vanilla/                   # @variantlab/vanilla      (phase 2)
│   ├── svelte/                    # @variantlab/svelte       (phase 3)
│   ├── solid/                     # @variantlab/solid        (phase 3)
│   ├── astro/                     # @variantlab/astro        (phase 3)
│   ├── nuxt/                      # @variantlab/nuxt         (phase 3)
│   ├── storybook/                 # @variantlab/storybook    (phase 3)
│   ├── eslint-plugin/             # @variantlab/eslint-plugin (phase 3)
│   ├── test-utils/                # @variantlab/test-utils   (phase 3)
│   ├── devtools/                  # @variantlab/devtools     (phase 2, browser ext)
│   └── cli/                       # @variantlab/cli
├── apps/
│   ├── docs/                      # Astro Starlight docs site
│   ├── playground/                # browser sandbox (paste config, see it work)
│   └── examples/
│       ├── next-app-router/
│       ├── next-pages/
│       ├── expo-router/
│       ├── react-native-cli/
│       ├── remix/
│       ├── vite-react/
│       ├── nuxt/
│       ├── sveltekit/
│       ├── solid-start/
│       └── astro/
└── tools/
    ├── size-limit.config.js
    └── scripts/
        ├── check-deps.js          # verify 0 runtime deps
        └── check-bundle-size.js
```

---

## Package boundaries

### `@variantlab/core`

The engine. Zero dependencies. Exports:

- `VariantEngine` class — the runtime state machine
- `createEngine(config, options)` factory
- `Storage` interface — pluggable persistence
- `Fetcher` interface — optional remote config loader
- `Telemetry` interface — optional event sink
- `Targeting` utilities — predicate evaluation
- `Assignment` strategies — default, random, sticky-hash, weighted
- Type exports: `Experiment`, `Variant`, `VariantContext`, `ExperimentsConfig`

**Allowed globals**: `crypto` (Web Crypto API), `Date`, `Math`. Nothing else. No `document`, no `window`, no `localStorage`, no `fetch`, no `process`.

**Runtime target**: ES2020. No `??=`, no top-level await, no decorators.

### `@variantlab/react`

React bindings. Depends on `@variantlab/core` and nothing else (React is a peer dep). Exports:

- `<VariantLabProvider config={...}>` — context provider
- `<Variant experimentId="...">` — render-prop switcher
- `<VariantValue experimentId="...">` — render-prop for value experiments
- `useVariant(id)` — hook returning the current variant ID
- `useVariantValue<T>(id)` — hook returning the variant's value
- `useExperiment(id)` — hook returning `{ variant, value, track }`
- `useSetVariant()` — hook to imperatively override a variant (dev only by default)
- `<VariantDebugOverlay />` — floating debug picker (tree-shaken in production builds)
- `<VariantErrorBoundary experimentId="...">` — error boundary that reports crashes to the engine

**React version**: 18.2+ and 19. Uses `useSyncExternalStore` for concurrent-mode safety.

### `@variantlab/react-native`

React Native + Expo bindings. Depends on `@variantlab/core`, peer-depends on `react-native` and optionally `@react-native-async-storage/async-storage`, `react-native-mmkv`, `expo-secure-store`. Exports the same surface as `@variantlab/react` plus:

- Default `AsyncStorageAdapter`, `MMKVStorageAdapter`, `SecureStoreAdapter`
- `<VariantDebugOverlay>` with RN-native UI (floating button, bottom sheet, QR modal, shake-to-open)
- `useRouteAwareExperiments()` — filters experiments by current Expo Router / React Navigation route
- Deep-link handler for `myapp://variantlab?set=...`

### `@variantlab/next`

Next.js 14 and 15 bindings. Supports both App Router and Pages Router. Exports:

- `createVariantLabServer(config)` — SSR-aware engine factory
- `<VariantLabProvider>` — client component version (re-exports from `@variantlab/react`)
- `getVariantSSR(experimentId, req)` — server helper for App Router loaders and Pages `getServerSideProps`
- `variantLabMiddleware(config)` — Next.js middleware that sets a sticky cookie
- React Server Component support for reading variants on the server

### `@variantlab/cli`

Command-line tool. Dev dependency only, never ships to production. Exports binary `variantlab`:

- `variantlab init` — scaffold `experiments.json` + install recommended adapter
- `variantlab generate` — codegen `.d.ts` from `experiments.json`
- `variantlab validate` — validate config against schema + check for orphaned IDs
- `variantlab scaffold <experiment-id>` — scaffold boilerplate for a new experiment

**Runtime**: Node 18+. The CLI is allowed dependencies (`commander`, `chalk`) — they do not affect the runtime packages.

---

## Runtime data flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   Application code (framework)                  │
│                                                                  │
│   useVariant("x")     <Variant experimentId="x">    track(...)  │
└──────────┬──────────────────────┬──────────────────────┬────────┘
           │                      │                      │
           │                      │                      │
┌──────────▼──────────────────────▼──────────────────────▼────────┐
│                       Framework adapter                         │
│                  (@variantlab/react, /next, ...)                 │
│                                                                  │
│   React Context  │  Hooks  │  SSR helpers  │  Debug overlay     │
└──────────┬──────────────────────────────────────────────────────┘
           │
           │  subscribe / getVariant / setVariant / trackEvent
           │
┌──────────▼──────────────────────────────────────────────────────┐
│                      @variantlab/core                           │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐  │
│  │  Engine    │──│  Targeting │──│ Assignment │──│  Schema  │  │
│  │            │  │            │  │            │  │ validator│  │
│  └─────┬──────┘  └────────────┘  └────────────┘  └──────────┘  │
│        │                                                        │
│        │                                                        │
│  ┌─────▼──────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐  │
│  │  Storage   │  │  Fetcher   │  │  Telemetry │  │  Crypto  │  │
│  │ (injected) │  │ (injected) │  │ (injected) │  │ (WebAPI) │  │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Resolve variant (hot path)

Called on every `useVariant()` read. Must be O(1).

1. Adapter calls `engine.getVariant(experimentId, context)`.
2. Engine checks in-memory override map (dev/debug overrides win).
3. Engine checks Storage for a persisted assignment.
4. If none, engine evaluates targeting predicates against `context`.
5. If targeting passes, engine runs the assignment strategy (sticky-hash/weighted/default).
6. Engine writes the result to Storage and memoizes.
7. Engine emits an `onAssignment` event to Telemetry (first time only per session).
8. Returns variant ID.

### Load config (cold start)

1. App mounts provider with inline config or async `Fetcher`.
2. Engine validates config against `experiments.schema.json` (hand-rolled validator, no zod).
3. If HMAC signature is present, engine verifies via Web Crypto `crypto.subtle.verify`.
4. Engine hydrates Storage — reads all previously persisted assignments.
5. Engine emits `onReady` event.

### Override flow (dev / QA)

1. User taps a variant in `<VariantDebugOverlay>`, or deep link fires, or QR is scanned.
2. Adapter calls `engine.setVariant(experimentId, variantId)`.
3. Engine writes override to Storage with priority flag.
4. Engine emits `onVariantChanged`.
5. All subscribed components re-render via `useSyncExternalStore`.

### Crash rollback flow

1. `<VariantErrorBoundary experimentId="x">` catches an error.
2. Adapter calls `engine.reportCrash(experimentId, error)`.
3. Engine increments a crash counter in Storage scoped to `(experimentId, variantId, sessionId)`.
4. If counter exceeds `rollbackThreshold` within `rollbackWindow`, engine:
   - Clears the persisted assignment
   - Forces the user to the experiment's `default` variant
   - Marks this variant as "quarantined" for the session
   - Emits `onRollback` event

Full details in [`docs/features/crash-rollback.md`](./docs/features/crash-rollback.md).

---

## Build tooling

| Tool | Purpose | Why |
|---|---|---|
| **pnpm** | Package manager + workspace | Fast, disk-efficient, strict hoisting |
| **tsup** | Bundle libraries | Fast (esbuild), dual ESM+CJS, `.d.ts` generation |
| **TypeScript 5.6+** | Type checking | Latest language features, strict mode |
| **Vitest** | Unit + integration tests | Vite-native, fast, TypeScript-first, works in Node + browser |
| **Playwright** | E2E tests in example apps | Cross-browser, cross-platform |
| **size-limit** | Bundle size enforcement | CI-blocking on budget violations |
| **Changesets** | Versioning + changelog | Per-package semver with provenance |
| **Biome** | Lint + format | 30x faster than ESLint/Prettier, single binary |
| **Astro Starlight** | Docs site | Fast, SEO-friendly, native MDX |
| **sigstore** | Release signing | Supply-chain integrity |

### Why not Turbopack / Nx / Rush?

- **Turbopack** — not stable for libraries yet
- **Nx** — too heavy for our use case; we don't need task graphs across dozens of apps
- **Rush** — unnecessary ceremony for a small monorepo
- **Bun workspaces** — too young, not yet compatible with `changesets`

pnpm + tsup + changesets is the sweet spot for publishing libraries in 2025.

### Why Biome over ESLint + Prettier?

- One binary, one config, 30x faster
- Zero JS plugin runtime (everything is Rust-native)
- Reduces CI minutes significantly in a monorepo of 10+ packages

---

## Size budgets

Enforced in CI via `size-limit`. PRs that exceed the budget are blocked.

| Package | Budget (gzipped) | Notes |
|---|---:|---|
| `@variantlab/core` | **3.0 KB** | Zero dependencies, pure TS |
| `@variantlab/react` | **1.5 KB** | Excludes core |
| `@variantlab/react-native` | **4.0 KB** | Includes debug overlay (tree-shakable in production) |
| `@variantlab/next` | **2.0 KB** | Excludes core, excludes React |
| `@variantlab/remix` | **1.5 KB** | |
| `@variantlab/vue` | **1.5 KB** | |
| `@variantlab/svelte` | **1.0 KB** | Svelte compiles away most of the runtime |
| `@variantlab/solid` | **1.0 KB** | |
| `@variantlab/vanilla` | **0.5 KB** | Just the hook + engine re-export |

**Debug overlay is always tree-shaken in production builds.** We use a dev-only import pattern:

```ts
// @variantlab/react-native exports:
export { VariantDebugOverlay } from "./debug/overlay";

// Production usage — bundler drops the whole module:
import { VariantDebugOverlay } from "@variantlab/react-native";
{process.env.NODE_ENV !== "production" && <VariantDebugOverlay />}
```

Additional strategy: the overlay lives in its own entry point `@variantlab/react-native/debug` so users can import it only in dev.

---

## Dependency policy

### Runtime dependencies

- **Core package**: **zero** runtime dependencies, forever. Enforced by `tools/scripts/check-deps.js` in CI.
- **Adapter packages**: may list `@variantlab/core` as the only runtime dep. Everything else is peer.
- **Peer dependencies**: framework itself (React, Vue, etc.) and optional integrations (`react-native-mmkv`, `@react-native-async-storage/async-storage`, etc.).

### Dev dependencies

- Build tooling (`tsup`, `typescript`, `biome`) is shared at the workspace root.
- Per-package dev deps are allowed when framework-specific (e.g., `@testing-library/react` in `react`).

### Why this matters

Every runtime dependency is a supply-chain attack vector, a potential version conflict, and added bundle size. By refusing runtime deps we:

- Reduce audit surface to zero for `@variantlab/core`
- Eliminate dependency version conflicts
- Enable safe use in any JavaScript runtime
- Prevent transitive bloat

See [`docs/research/bundle-size-analysis.md`](./docs/research/bundle-size-analysis.md) and [`SECURITY.md`](./SECURITY.md).

---

## Versioning and release strategy

- **Semver strict.** Breaking API changes require a major version bump in every affected package.
- **Changesets** manages per-package versioning. Each PR with a public API change must include a changeset.
- **Lock-step releases** for `@variantlab/core` and all adapters during 0.x, so users don't mismatch versions.
- **Provenance**: every npm publish is signed via `npm publish --provenance` and logged to the public Sigstore transparency log.
- **SBOM**: a CycloneDX SBOM is generated on release and attached to the GitHub release.

### Release cadence

- **Patch**: as needed, within 48 hours of a verified bug fix
- **Minor**: every 2-4 weeks in the 0.x phase, then monthly post-1.0
- **Major**: only with a 30-day RFC period and a migration guide

---

## Testing strategy

| Layer | Tool | Coverage target |
|---|---|---|
| Unit (core engine) | Vitest | 95%+ |
| Unit (adapters) | Vitest + framework testing libs | 90%+ |
| Integration (example apps) | Playwright | Smoke tests pass |
| Property-based (hash, assignment) | fast-check (dev only) | Invariants hold |
| Fuzz (schema validator) | Custom fuzzer | No crashes on malformed input |
| Compat matrix | GitHub Actions | Node 18/20/22, React 18/19, RN 0.74+ |
| Bundle size | size-limit | All packages under budget |
| Type coverage | `tsc --strict` + `typescript-coverage-report` | 100% |

**Test philosophy**: every bug fix must come with a regression test. Every public API must have an integration test in an example app.

---

## CI/CD pipeline

### `ci.yml` (on every PR)

1. Install pnpm + dependencies
2. Lint + format check (Biome)
3. Type check (`tsc --noEmit`)
4. Unit tests (Vitest)
5. Build all packages (tsup)
6. Check bundle sizes (size-limit)
7. Check zero-dep policy (custom script)
8. Run example app smoke tests (Playwright)
9. Generate coverage report

### `release.yml` (on merge to main)

1. Detect pending changesets
2. Open or update "Version Packages" PR
3. On merge, publish with `npm publish --provenance`
4. Sign release with sigstore
5. Generate SBOM
6. Create GitHub release with changelog
7. Update docs site

### `compat-matrix.yml` (nightly)

Tests against:

- Node 18, 20, 22
- React 18.2, 18.3, 19.0
- React Native 0.74, 0.75, 0.76
- Next.js 14, 15
- Vue 3.4, 3.5
- Svelte 4, 5
- Solid 1.8, 1.9

Fails the build if any combination breaks. Prevents silent regressions.

### `sigstore.yml` (on release tag)

Signs all published packages and updates provenance attestations.

---

## See also

- [`API.md`](./API.md) — complete TypeScript API surface
- [`SECURITY.md`](./SECURITY.md) — threat model and mitigations
- [`docs/research/bundle-size-analysis.md`](./docs/research/bundle-size-analysis.md) — how we hit the size budgets
- [`docs/design/api-philosophy.md`](./docs/design/api-philosophy.md) — API design decisions
