# @variantlab/core

> The framework-agnostic A/B testing and feature-flag engine. Zero runtime dependencies, runs anywhere.

![npm version](https://img.shields.io/npm/v/@variantlab/core/alpha?label=npm&color=blue)
![bundle size](https://img.shields.io/badge/gzip-%3C3KB-brightgreen)
![dependencies](https://img.shields.io/badge/runtime%20deps-0-brightgreen)

## Install

```bash
npm install @variantlab/core@alpha
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
      "type": "value",
      "default": "buy-now",
      "variants": [
        { "id": "buy-now", "value": "Buy now" },
        { "id": "get-started", "value": "Get started" }
      ]
    },
    {
      "id": "hero-layout",
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

## Assignment strategies

The engine supports multiple assignment strategies per experiment:

| Strategy | Description |
|----------|-------------|
| `default` | Always assigns the default variant |
| `random` | Random assignment on each evaluation |
| `sticky-hash` | Deterministic hash-based assignment (requires `userId`) |
| `weighted` | Weighted random distribution |

```json
{
  "id": "pricing",
  "type": "value",
  "default": "low",
  "assignment": { "strategy": "sticky-hash" },
  "variants": [
    { "id": "low", "value": 9.99, "weight": 50 },
    { "id": "high", "value": 14.99, "weight": 50 }
  ]
}
```

## Targeting operators

Built-in targeting predicates:

- `platform` — `ios`, `android`, `web`
- `appVersion` — semver ranges (`>=1.2.0`, `^2.0.0`)
- `locale` — locale codes (`en`, `bn`, `fr`)
- `screenSize` — `small`, `medium`, `large`
- `routes` — glob patterns (`/settings/*`, `/dashboard`)
- `userId` — exact match or list
- `attributes` — custom key-value matching
- `predicate` — compound `and`/`or`/`not` logic

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

## Documentation

This package ships with full documentation in the `docs/` directory. After installing, find them at `node_modules/@variantlab/core/docs/`.

### Overview

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — monorepo layout, runtime data flow, size budgets
- [API.md](./docs/API.md) — complete TypeScript API surface
- [SECURITY.md](./docs/SECURITY.md) — threat model, mitigations, reporting
- [ROADMAP.md](./docs/ROADMAP.md) — phased feature rollout
- [CONTRIBUTING.md](./docs/CONTRIBUTING.md) — how to contribute

### Research

- [competitors.md](./docs/research/competitors.md) — full competitor analysis
- [bundle-size-analysis.md](./docs/research/bundle-size-analysis.md) — how we hit < 3 KB
- [framework-ssr-quirks.md](./docs/research/framework-ssr-quirks.md) — per-framework SSR notes
- [origin-story.md](./docs/research/origin-story.md) — the small-phone card problem that started it
- [naming-rationale.md](./docs/research/naming-rationale.md) — why "variantlab"
- [security-threats.md](./docs/research/security-threats.md) — threat landscape review

### Design decisions

- [design-principles.md](./docs/design/design-principles.md) — the 8 core principles with rationale
- [config-format.md](./docs/design/config-format.md) — `experiments.json` specification
- [targeting-dsl.md](./docs/design/targeting-dsl.md) — targeting predicate language
- [api-philosophy.md](./docs/design/api-philosophy.md) — why the API looks the way it does

### Feature specs

- [codegen.md](./docs/features/codegen.md) — type generation from config
- [targeting.md](./docs/features/targeting.md) — segmentation predicates
- [value-experiments.md](./docs/features/value-experiments.md) — non-render variant values
- [debug-overlay.md](./docs/features/debug-overlay.md) — runtime picker UX
- [crash-rollback.md](./docs/features/crash-rollback.md) — error-boundary-driven auto-rollback
- [qr-sharing.md](./docs/features/qr-sharing.md) — state sharing via QR codes
- [hmac-signing.md](./docs/features/hmac-signing.md) — config integrity verification
- [time-travel.md](./docs/features/time-travel.md) — record + replay debugging
- [multivariate.md](./docs/features/multivariate.md) — crossed experiments
- [killer-features.md](./docs/features/killer-features.md) — the 10 differentiators

### Roadmap

- [phase-2-expansion.md](./docs/phases/phase-2-expansion.md) — Remix, Vue, vanilla JS, devtools
- [phase-3-ecosystem.md](./docs/phases/phase-3-ecosystem.md) — Svelte, Solid, Astro, Nuxt, addons
- [phase-4-advanced.md](./docs/phases/phase-4-advanced.md) — HMAC GA, crash rollback GA, time travel
- [phase-5-v1-stable.md](./docs/phases/phase-5-v1-stable.md) — v1.0 release criteria

## License

[MIT](./LICENSE)
