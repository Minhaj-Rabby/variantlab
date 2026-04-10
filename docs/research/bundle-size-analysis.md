# Bundle size analysis

How we plan to hit **< 3 KB gzipped for `@variantlab/core`** and the other budgets in [`ARCHITECTURE.md`](../../ARCHITECTURE.md).

## Table of contents

- [Why bundle size matters](#why-bundle-size-matters)
- [The budgets](#the-budgets)
- [Techniques we use](#techniques-we-use)
- [Techniques we avoid](#techniques-we-avoid)
- [Measurement methodology](#measurement-methodology)
- [Per-feature cost estimates](#per-feature-cost-estimates)
- [What happens when we exceed the budget](#what-happens-when-we-exceed-the-budget)

---

## Why bundle size matters

1. **First-contentful-paint on mobile web.** Every KB in your JS bundle delays FCP by ~10-20 ms on median 4G connections. A 30 KB A/B testing SDK costs half a second before your users see anything.
2. **React Native cold-start time.** Hermes parses JS on every cold launch. Larger bundles = slower launches. Users notice 100 ms delays.
3. **Edge runtime limits.** Cloudflare Workers have a 1 MB unzipped bundle limit. Every KB matters.
4. **Dependency hell avoidance.** Small bundles can be copy-pasted as a file. Large bundles force you to dependency-manage.
5. **Honesty.** Most A/B testing SDKs bloat over time. Committing to a hard budget at the start keeps us honest.

---

## The budgets

| Package | Budget (gzipped) | Rationale |
|---|---:|---|
| `@variantlab/core` | **3 KB** | The entire engine. This is the number people will benchmark us on. |
| `@variantlab/react` | **1.5 KB** | Just hooks + context + render-prop components. |
| `@variantlab/react-native` | **4 KB** | Includes debug overlay; tree-shaken in prod. |
| `@variantlab/next` | **2 KB** | Server + middleware + client re-exports. |
| `@variantlab/remix` | **1.5 KB** | Loader helpers + cookie stickiness. |
| `@variantlab/vue` | **1.5 KB** | Composables + components. |
| `@variantlab/svelte` | **1 KB** | Svelte compiles most of the runtime away. |
| `@variantlab/solid` | **1 KB** | Same reason. |
| `@variantlab/vanilla` | **0.5 KB** | Just a hook over the engine. |
| `@variantlab/astro` | **1 KB** | Astro integration is very thin. |
| `@variantlab/nuxt` | **1.5 KB** | Nuxt module wrapping Vue adapter. |

All budgets are **enforced in CI** by `size-limit`. A PR that exceeds any budget is blocked.

---

## Techniques we use

### 1. Zero runtime dependencies

Every runtime dependency adds at minimum a few hundred bytes of import overhead and often much more due to transitive bloat. We ship zero.

**What we would pull in if we were careless**:

| Dep | Purpose | Cost (gzipped) |
|---|---|---:|
| `zod` | Schema validation | ~12 KB |
| `valibot` | Schema validation | ~2 KB |
| `lodash.merge` | Deep merge | ~1 KB |
| `nanoid` | ID generation | ~130 B |
| `ms` | Duration parsing | ~250 B |
| `semver` | Version range matching | ~6 KB |
| `glob` | Pattern matching | ~4 KB |

Total if we used all of these: ~25 KB.

**What we do instead**: Write hand-rolled replacements. Each is 100-400 bytes and purpose-built for our use case. Total cost: ~1.5 KB for all replacements combined.

### 2. Pure ESM with tree-shaking

- Every module exports only what it needs
- No barrel files that re-export everything
- No side effects marked at package.json level: `"sideEffects": false`
- Bundlers (esbuild, Rollup, Vite, Webpack 5+) automatically drop unused code

### 3. No class inheritance hierarchies

Classes with inheritance force bundlers to include the whole chain. We use a single `VariantEngine` class with composition via injected interfaces (`Storage`, `Fetcher`, `Telemetry`).

### 4. No generics at runtime

TypeScript generics are compile-time only. We never use reflection, `Object.keys`, or runtime type checks beyond simple `typeof` guards.

### 5. Hand-rolled schema validator

The schema validator is ~400 bytes. It's a switch statement over primitive types plus an allow-list check for object keys. That's it. No recursive descent parsers, no grammar, no regex. It rejects anything it doesn't understand.

### 6. Hand-rolled semver matcher

We support only the operators that matter for targeting: `>=`, `<`, `<=`, `>`, `=`, `^`, `~`, range dashes. Total implementation: ~250 bytes. Full `semver` package is 6 KB. We lose nothing practical.

### 7. Hand-rolled glob matcher

We support `/foo`, `/foo/*`, `/foo/**`, and `/foo/:param`. No character classes, no negation, no brace expansion. Total implementation: ~150 bytes. The `glob` or `minimatch` packages are 4+ KB.

### 8. Hand-rolled hash function

For sticky assignment we need a stable hash of `(userId, experimentId)`. We use a simplified 32-bit FNV-1a implementation: ~80 bytes. `murmurhash` is 500 bytes.

### 9. Web Crypto API for HMAC

`crypto.subtle.verify` is available in every modern runtime — browsers, Node 18+, Deno, Bun, Cloudflare Workers, React Native Hermes (via `react-native-quick-crypto` peer dep). We use the platform, not a polyfill. Zero bytes for HMAC.

### 10. Dead code elimination via `__DEV__`

Debug overlay code and extended error messages are gated behind `typeof __DEV__ !== "undefined"` or `process.env.NODE_ENV !== "production"`. Bundlers replace these at build time with constants and drop unreachable branches.

Example:

```ts
function validateExperiment(exp) {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    if (!exp.id) {
      throw new Error(
        `Experiment missing ID. Experiments need a unique string ID to track assignments. Example: { id: "my-experiment", ... }`
      );
    }
  } else {
    if (!exp.id) throw new Error("no id");
  }
}
```

In production, the verbose error message is eliminated entirely.

### 11. Minification-friendly APIs

- Short internal names
- Exported names are the only ones that survive minification
- No computed property names in hot paths
- No `arguments` object usage

### 12. Separate entry points

Instead of one big `index.ts`, each feature is a separate entry point:

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./debug": "./dist/debug.js",
    "./crypto": "./dist/crypto.js",
    "./storage/memory": "./dist/storage-memory.js"
  }
}
```

Users import only what they need. `@variantlab/core/debug` is separate from `@variantlab/core` so debug code never ships to production.

---

## Techniques we avoid

### Class transforms and polyfills

No `Object.entries` polyfills (required since ES2017). No `class` polyfills (required since ES2015). Target ES2020 baseline — Hermes, Node 18, every modern browser.

### JSON Schema libraries

JSON Schema validators are 20-100+ KB. We use our hand-rolled validator for runtime + publish the `experiments.schema.json` only for IDE tooling.

### Runtime TypeScript features

- No `enum` (produces runtime object)
- No `namespace` (produces runtime object)
- No decorators
- No reflect-metadata

### Prototype chains

A single class. No inheritance. No mixins.

### Eager initialization

Storage is lazy. Fetcher polling is lazy. Crash-rollback counters allocate on first crash. Nothing runs until you call into the engine.

---

## Measurement methodology

### Tooling

- **`size-limit`** with the `@size-limit/esbuild` plugin — matches what users actually ship
- **Bundlephobia** referenced for competitive comparison
- **Webpack stats-analyzer** for identifying unexpected bloat

### Automation

- Every PR runs `size-limit` as a required check
- Size changes are reported as a PR comment
- A release cannot ship if any package exceeds budget

### Real-world measurement

We test bundle impact in real apps:

1. **Drishtikon Mobile** (React Native, Expo)
2. **Next.js App Router example**
3. **SvelteKit example**
4. **Vite + React example**

Each example publishes its production bundle size to a tracking doc so we see *actual user impact*, not just synthetic benchmarks.

---

## Per-feature cost estimates

Rough estimates based on our hand-rolled implementations:

| Feature | Estimated cost (gzipped) |
|---|---:|
| `VariantEngine` class + constructor | ~500 B |
| Schema validator | ~400 B |
| Targeting matcher | ~300 B |
| Semver matcher | ~250 B |
| Glob route matcher | ~150 B |
| Sticky hash function | ~80 B |
| Assignment strategies | ~200 B |
| Storage interface + memory impl | ~150 B |
| Fetcher interface | ~80 B |
| Telemetry interface | ~50 B |
| Crash rollback logic | ~200 B |
| Time-travel recording | ~150 B (off by default) |
| HMAC verification (WebCrypto wrapper) | ~150 B |
| Error classes | ~150 B |
| Type exports (zero runtime) | 0 B |
| Boilerplate / glue | ~200 B |
| **Total core** | **~3000 B** |

Fits within the 3 KB budget with ~100 B to spare. Any new feature must either stay under that headroom or displace an existing feature.

---

## What happens when we exceed the budget

A PR that exceeds the budget is blocked by CI. The author must either:

1. **Optimize** the change to fit
2. **Remove** an existing feature to make room
3. **Move** the change to a separate entry point (e.g., `@variantlab/core/extra`)
4. **Request a budget increase** via a GitHub discussion, requiring 2 maintainer approvals

We expect to reject the majority of budget-increase requests. The budget is the contract.

---

## Comparison: what we avoid

If we used common conveniences, our core would be:

| Luxury | Cost | Running total |
|---|---:|---:|
| Starting point (hand-rolled) | 3.0 KB | 3.0 KB |
| Add `zod` for schema | +12 KB | 15 KB |
| Add `semver` | +6 KB | 21 KB |
| Add `minimatch` | +4 KB | 25 KB |
| Add `lodash.merge` | +1 KB | 26 KB |
| Add `eventemitter3` | +1 KB | 27 KB |
| Add `nanoid` | +0.5 KB | 27.5 KB |

**We would be nearly 10x our budget** before we wrote a line of actual logic. This is why zero-dependency is the founding principle, not an optimization we add later.

---

## Future work

- **Brotli-compressed size as a secondary metric.** Browsers support Brotli; npm does not measure it. We should publish both numbers.
- **ESBuild minification tuning.** Terser may squeeze out a few more bytes in corner cases.
- **Constant folding for literal configs.** If a user passes a literal JSON config, we can inline it at build time via a plugin.
- **Subsetting for fixed-feature builds.** If someone uses only value experiments and never render experiments, we could ship a smaller build.

---

## See also

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md#size-budgets) — the budget table
- [`docs/design/api-philosophy.md`](../design/api-philosophy.md) — how API choices affect bundle size
- Bundlephobia: https://bundlephobia.com (for competitor measurements)
- size-limit: https://github.com/ai/size-limit
