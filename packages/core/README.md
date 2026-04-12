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

## License

[MIT](./LICENSE)
