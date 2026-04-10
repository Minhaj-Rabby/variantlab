# API philosophy

Why the variantlab public API looks the way it does. This document is about design taste, not feature specs. If you disagree with a choice here, open a discussion — but first, understand the reasoning.

## Table of contents

- [Core tenets](#core-tenets)
- [Hook-first design](#hook-first-design)
- [Render-prop for component swaps](#render-prop-for-component-swaps)
- [Why not a single mega-hook](#why-not-a-single-mega-hook)
- [Why generics over function overloads](#why-generics-over-function-overloads)
- [Error handling philosophy](#error-handling-philosophy)
- [Naming conventions](#naming-conventions)
- [Opinions we deliberately avoid](#opinions-we-deliberately-avoid)
- [Influences](#influences)

---

## Core tenets

1. **If you can't learn it in 10 minutes, it's wrong.**
2. **Type safety is a feature, not a compromise.**
3. **One obvious way to do things.**
4. **Hooks for values, components for rendering.**
5. **Errors are values until they're fatal.**
6. **Never surprise the user.**

---

## Hook-first design

### Decision

The primary API is hooks, not classes or singletons.

### Why

React hooks are the native React idiom. Vue composables, Svelte stores, Solid signals, and Nuxt composables all follow the same pattern. A hook-first API maps 1:1 across frameworks.

```tsx
// React
const variant = useVariant("cta-copy");

// Vue 3
const variant = useVariant("cta-copy");

// Svelte 5
const variant = $derived(useVariant("cta-copy"));

// Solid
const variant = useVariant("cta-copy");
```

Same signature, same mental model, different reactive semantics under the hood.

### What we rejected

- **Class-based API** — `new VariantLab().getVariant()`. Too OOP, doesn't fit modern frontend.
- **Singleton module** — `import vl from 'variantlab'; vl.getVariant()`. Impossible to test, impossible to SSR cleanly.
- **Provider injection** — `@inject VariantLab`. Angular-style, foreign to React/Vue/Svelte devs.

---

## Render-prop for component swaps

### Decision

Component-swap experiments use a render-prop component:

```tsx
<Variant experimentId="news-card-layout">
  {{
    responsive: <ResponsiveCard />,
    "scale-to-fit": <ScaleToFitCard />,
    "pip-thumbnail": <PipCard />,
  }}
</Variant>
```

### Why

The alternative is imperative:

```tsx
const variant = useVariant("news-card-layout");
if (variant === "responsive") return <ResponsiveCard />;
if (variant === "scale-to-fit") return <ScaleToFitCard />;
if (variant === "pip-thumbnail") return <PipCard />;
```

Both work. The render-prop version is better because:

1. **Exhaustiveness**: TypeScript can verify that every variant ID has a component
2. **Fallback**: `fallback` prop handles unknown variants and errors
3. **Consistency**: same pattern across all framework adapters
4. **Discoverability**: one grep finds every experiment in the codebase

### Test

Can TypeScript catch a missing variant at compile time? Yes, via the codegen'd types:

```tsx
<Variant experimentId="news-card-layout">
  {{
    responsive: <ResponsiveCard />,
    "scale-to-fit": <ScaleToFitCard />,
    // ❌ Error: Property "pip-thumbnail" is missing in type
  }}
</Variant>
```

---

## Why not a single mega-hook

### Decision

We ship multiple narrow hooks instead of one that does everything:

```ts
useVariant(id)           // returns variant ID string
useVariantValue<T>(id)   // returns the value
useExperiment<T>(id)     // returns { variant, value, track }
useRouteExperiments()    // returns experiments for current route
useSetVariant()          // imperative setter (dev only)
useVariantLabEngine()    // low-level engine access
```

### Why

A single hook like `useVariantLab(id)` returning everything would be:

- Harder to type (what does it return?)
- Harder to tree-shake (pulls in all features even if unused)
- Confusing (users don't know what they get)

Narrow hooks:

- Each has one clear purpose
- Each has one return type
- Bundlers can tree-shake unused ones
- IDE autocomplete is meaningful

### The "one obvious way" principle

For any given task, there should be one obvious hook to use:

| Task | Hook |
|---|---|
| Read which variant is active | `useVariant` |
| Read a variant's value | `useVariantValue` |
| Track an exposure event | `useExperiment` |
| Get all experiments on the current page | `useRouteExperiments` |
| Change a variant from code (dev) | `useSetVariant` |
| Low-level access | `useVariantLabEngine` |

If you find yourself wondering "which hook do I use?", we failed. Open an issue.

---

## Why generics over function overloads

### Decision

`useVariantValue<T>(id)` takes a type parameter for the return value, not multiple overloads.

```ts
// This:
const price = useVariantValue<number>("pricing");

// Not this:
const price = useVariantValueNumber("pricing");
```

### Why

- One function name instead of `useVariantValueString`, `useVariantValueNumber`, `useVariantValueBoolean`, etc.
- Works with codegen: `useVariantValue("pricing")` narrows to `number` automatically when the experiment type is generated.
- Users can always widen or narrow explicitly.

### When codegen is active

With the generated types, the generic is inferred:

```ts
// Codegen knows cta-copy is a string experiment
const copy = useVariantValue("cta-copy"); // inferred: "Buy now" | "Get started" | "Try it free"
```

### When codegen is not active

Users can provide the type manually:

```ts
const copy = useVariantValue<string>("cta-copy"); // string
```

---

## Error handling philosophy

### Decision

Errors are values until they're fatal. The engine never throws on expected failures; it returns a default.

### The modes

- **fail-open** (default): Any error during resolution returns the experiment's default variant. Logs a warning.
- **fail-closed**: Any error throws. For apps that prefer loud failures over silent defaults.

### What throws in fail-closed mode

- `ConfigValidationError` — config doesn't match schema
- `SignatureVerificationError` — HMAC fails
- `UnknownExperimentError` — experiment ID not in config

### What never throws, even in fail-closed mode

- Normal variant resolution (falls back to default)
- Targeting evaluation (if a predicate throws, we catch it and log)
- Storage read failures (returns undefined)

### Why fail-open by default

Because you don't want your app to crash because a feature flag config has a typo. The worst realistic outcome should be "user sees the default variant", never "white screen of death".

### Why fail-closed as an option

Because some teams prefer loud failures in tests or staging. It's a one-line config change.

---

## Naming conventions

### Hooks start with `use`

Following React/Vue convention.

### Components are PascalCase

`<Variant>`, `<VariantLabProvider>`, `<VariantDebugOverlay>`.

### Function names are verbs

`createEngine`, `getVariantSSR`, `registerDeepLinkHandler`.

### Type names are nouns

`VariantEngine`, `Experiment`, `Variant`, `VariantContext`, `Targeting`.

### Constants are UPPER_SNAKE_CASE, but we have almost none

We avoid exporting constants. Users configure via the config, not magic numbers.

### Events are past-tense

`assignment`, `exposure`, `variantChanged`, `rollback`, `configLoaded`.

### Options are positional when obvious, named otherwise

```ts
createEngine(config, options); // 2 positional args, both clear
setVariant(experimentId, variantId); // 2 positional args, both clear

// Everything else uses named args via options objects
createHttpFetcher({ url, headers, pollInterval });
```

---

## Opinions we deliberately avoid

### We don't pick a telemetry provider

Users plug their own. We ship an interface, not an adapter for PostHog or Mixpanel. Including one would violate principle 7 (privacy by default).

### We don't pick a state management library

No Redux adapter, no Zustand adapter, no Jotai adapter. The engine exposes `subscribe` and that's enough. If users want to integrate with their state library, it's 10 lines of code.

### We don't pick a router

No dependency on Expo Router, React Router, Next Router, or anything else. We accept `route: string` as context and you pass whatever router you use.

### We don't pick a storage

AsyncStorage, MMKV, SecureStore, IndexedDB, localStorage, sessionStorage, cookies — all valid. We ship adapters for the common ones but the core has zero preferences.

### We don't assume a particular testing library

Test utilities work with Jest, Vitest, @testing-library/react, @testing-library/vue, Playwright. No hardcoded assumptions.

### We don't assume a particular build tool

Webpack, Rollup, esbuild, swc, tsc, Vite, Parcel — all work. We ship standard ESM+CJS with .d.ts.

---

## Influences

Our API taste comes from libraries we admire:

- **TanStack Query** — hook-first, TypeScript-first, framework-agnostic core, narrow public surface
- **Zod** — one obvious way, great type inference, zero magic
- **tRPC** — end-to-end type safety via codegen
- **Radix UI** — render-prop components for composition
- **Jotai** — minimal surface area, composable primitives
- **Drizzle ORM** — thin wrappers over primitives, no ORM magic
- **Hono** — small, fast, runs everywhere
- **Valibot** — zero-dep, tree-shakable, hand-rolled from the start

Each of these libraries is opinionated about *design*, not about *implementation*. They all refuse to do more than their one thing, and do it better than libraries that try to do everything.

---

## Anti-influences

Libraries whose approach we consciously avoid:

- **Redux** (early versions) — too much boilerplate, too many abstractions
- **Apollo Client** — tries to be everything, ships enormous bundles
- **Firebase JS SDK** — couples unrelated concerns, hard to tree-shake
- **Moment.js** — kitchen-sink API, enormous bundle
- **Lodash** (monolithic) — imports everything or requires per-function imports

The lesson from each: scope creep kills libraries. variantlab stays in scope.

---

## How to propose an API change

1. Open a GitHub discussion, not a PR
2. State the use case first, the API second
3. Show how existing APIs fall short
4. Propose 1-3 alternatives
5. Include bundle-size impact
6. Include how it interacts with the 8 design principles

We're willing to change the API. We're not willing to change principles.

---

## See also

- [`API.md`](../../API.md) — the canonical API surface
- [`docs/design/design-principles.md`](./design-principles.md) — the 8 principles
- [`docs/research/bundle-size-analysis.md`](../research/bundle-size-analysis.md) — why API decisions affect bundle size
