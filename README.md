# variantlab

> One config. Every framework. Zero lock-in. The universal, open-source A/B testing and feature-flagging toolkit.

![npm version](https://img.shields.io/npm/v/@variantlab/core/alpha?label=npm&color=blue)
![status](https://img.shields.io/badge/status-alpha-yellow)
![license](https://img.shields.io/badge/license-MIT-blue)
![bundle size](https://img.shields.io/badge/core-%3C3KB%20gz-brightgreen)
![dependencies](https://img.shields.io/badge/runtime%20deps-0-brightgreen)

**variantlab** is a free, open-source, framework-agnostic toolkit for running A/B tests, feature flags, and UI experiments in modern web and native apps. It exists because every existing solution is either a paid SaaS (LaunchDarkly, Statsig, Amplitude), vendor-locked (Firebase Remote Config), web-only (GrowthBook), or unmaintained (`react-native-ab`).

We asked a simple question: **what if one JSON config file could drive experiments in every framework you use — React, React Native, Next.js, Remix, Vue, Nuxt, Svelte, Solid, Astro, and vanilla JS — with the same types, the same behavior, and the same debug tooling, for free, forever?**

This is that project.

---

## Table of contents

- [Why it exists](#why-it-exists)
- [What makes it different](#what-makes-it-different)
- [30-second example](#30-second-example)
- [Feature matrix vs alternatives](#feature-matrix-vs-alternatives)
- [Supported frameworks](#supported-frameworks)
- [Core principles](#core-principles)
- [Project status](#project-status)
- [Documentation map](#documentation-map)
- [Contributing](#contributing)
- [License](#license)

---

## Why it exists

Every real product needs to answer questions like:

- _Does the new onboarding flow convert better?_
- _Should the CTA say "Buy now" or "Get started"?_
- _Does this layout work on small phones?_ (this is the exact problem that birthed variantlab — see [`docs/research/origin-story.md`](./docs/research/origin-story.md))
- _Which pricing tier leads to more upgrades?_
- _Can we ship this risky feature behind a kill switch?_

The existing options are all broken in at least one of these ways:

| Problem                  | Example                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Paid**                 | LaunchDarkly starts at $8.33/seat/month. Statsig charges for events. Amplitude Experiment is enterprise-only. |
| **Vendor-locked**        | Firebase Remote Config ties you to the Google Cloud stack. Not free if you outgrow Spark tier.                |
| **Web-only**             | GrowthBook, Flagsmith React SDK — limited React Native story, no SSR edge support.                            |
| **One-framework-only**   | `react-native-ab`, various Next.js-only libraries.                                                            |
| **Unmaintained**         | Several popular OSS A/B libraries haven't had a release in 2+ years.                                          |
| **Heavy**                | Several SDKs ship 40 KB+ of code just to read a boolean.                                                      |
| **Telemetry-by-default** | Many SDKs phone home on import — a GDPR liability.                                                            |

variantlab fixes all of these simultaneously by separating the _engine_ from the _bindings_ and refusing to depend on anything at runtime.

---

## What makes it different

### 1. Truly universal — one config, ten+ frameworks

Write one `experiments.json`. Use it in React, React Native, Next.js App Router, Remix loaders, Vue composables, Svelte stores, SolidJS signals, Astro islands, Nuxt modules, or vanilla JS. Same config, same types, same behavior, same debug overlay (where applicable).

### 2. Zero runtime dependencies. Ever.

The core package has **0 runtime dependencies**. Not lodash, not zod, not nanoid. We ship hand-rolled replacements. Target bundle size: **< 3 KB gzipped for `@variantlab/core`**, enforced in CI. See [`docs/research/bundle-size-analysis.md`](./docs/research/bundle-size-analysis.md).

### 3. Codegen'd type safety

Run `npx variantlab generate`. Your `experiments.json` becomes a `.d.ts` file. `useVariant("news-card-layout")` narrows to the literal union of variant IDs you declared. Typos become compile errors. See [`docs/features/codegen.md`](./docs/features/codegen.md).

### 4. SSR and edge-runtime correct

Works in Node, Deno, Bun, Cloudflare Workers, Vercel Edge, AWS Lambda@Edge, React Native Hermes, and browsers. No hydration mismatches in Next.js App Router, Remix, SvelteKit, SolidStart, or Nuxt. See [`docs/research/framework-ssr-quirks.md`](./docs/research/framework-ssr-quirks.md).

### 5. HMAC-signed configs (optional but built in)

If you fetch config remotely, you can sign it. The client verifies via Web Crypto API before applying. Stops CDN tampering, MITM, and malicious config injection — for free. See [`docs/features/hmac-signing.md`](./docs/features/hmac-signing.md).

### 6. Screen-size and device-class targeting

Built-in targeting predicates for `screenSize: small | medium | large`, `platform: ios | android | web`, `appVersion: ">=1.2.0"`, `locale: bn | en`. Firebase doesn't have this. GrowthBook doesn't either. See [`docs/features/targeting.md`](./docs/features/targeting.md).

### 7. Crash-triggered auto-rollback

An ErrorBoundary feeds crash signals into the engine. If variant _X_ crashes _N_ times in _M_ minutes, the engine auto-reverts that user to the default variant and emits an `onRollback` event for your monitoring. LaunchDarkly charges four figures a month for this. See [`docs/features/crash-rollback.md`](./docs/features/crash-rollback.md).

### 8. Deep-link + QR override for QA

`myapp://variantlab?set=news-card-layout:pip-thumbnail` forces a variant on device. QR button in the debug overlay encodes the current state — teammates scan and reproduce in 5 seconds. See [`docs/features/qr-sharing.md`](./docs/features/qr-sharing.md).

### 9. Value experiments (not just component swaps)

```ts
const copy = useVariantValue<string>("cta-copy"); // "Buy now" | "Get started"
const price = useVariantValue<number>("pricing"); // 9.99 | 14.99
```

Not just render-swapping. Any runtime value. Covers 80% of real-world needs. See [`docs/features/value-experiments.md`](./docs/features/value-experiments.md).

### 10. Privacy-first, zero-telemetry by default

variantlab does **not** phone home. Ever. No analytics, no "anonymous" ping on import, no external requests unless you explicitly configure them. GDPR and CCPA compliant out of the box. See [`SECURITY.md`](./SECURITY.md).

---

## 30-second example

### 1. Install

```bash
npm install @variantlab/core @variantlab/react
```

### 2. Define experiments

```json
// experiments.json
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
    },
    {
      "id": "hero-layout",
      "name": "Hero section layout",
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

### 3. Create the engine and wrap your app

```tsx
import { createEngine } from "@variantlab/core";
import { VariantLabProvider } from "@variantlab/react";
import experiments from "./experiments.json";

const engine = createEngine(experiments);

export default function App() {
  return (
    <VariantLabProvider engine={engine}>
      <YourApp />
    </VariantLabProvider>
  );
}
```

### 4. Use experiments

```tsx
import { useVariantValue, Variant } from "@variantlab/react";

function CheckoutButton() {
  const copy = useVariantValue<string>("cta-copy");
  return <button>{copy}</button>;
}

function HeroSection() {
  return (
    <Variant experimentId="hero-layout" fallback={<CenteredHero />}>
      {{
        centered: <CenteredHero />,
        split: <SplitHero />,
      }}
    </Variant>
  );
}
```

### 5. Generate types (optional but recommended)

```bash
npx variantlab generate
```

Now `useVariantValue("cta-copy")` returns `"Buy now" | "Get started" | "Try it free"` as a literal type. Typos become compile errors.

That's it. No account, no SaaS, no telemetry, no lock-in.

---

## Feature matrix vs alternatives

| Feature                              | variantlab | Firebase Remote Config | GrowthBook | Statsig | LaunchDarkly | Amplitude Experiment |
| ------------------------------------ | :--------: | :--------------------: | :--------: | :-----: | :----------: | :------------------: |
| **Free forever**                     |     ✅     |        Limited         |     ✅     | Limited |      ❌      |          ❌          |
| **Self-hosted / local-first**        |     ✅     |           ❌           |     ✅     |  Paid   |      ❌      |          ❌          |
| **Zero runtime deps in core**        |     ✅     |           ❌           |     ❌     |   ❌    |      ❌      |          ❌          |
| **Core < 3 KB gzipped**              |     ✅     |           ❌           |     ❌     |   ❌    |      ❌      |          ❌          |
| **Type-safe via codegen**            |     ✅     |           ❌           |     ❌     | Partial |   Partial    |          ❌          |
| **React**                            |     ✅     |           ✅           |     ✅     |   ✅    |      ✅      |          ✅          |
| **React Native**                     |     ✅     |           ✅           |  Partial   |   ✅    |      ✅      |       Partial        |
| **Next.js App Router SSR**           |     ✅     |        Partial         |  Partial   | Partial |      ✅      |       Partial        |
| **Remix loaders**                    |     ✅     |           ❌           |  Partial   |   ❌    |   Partial    |          ❌          |
| **Vue / Nuxt**                       |     ✅     |           ❌           |  Partial   |   ❌    |      ❌      |          ❌          |
| **Svelte / SvelteKit**               |     ✅     |           ❌           |     ❌     |   ❌    |      ❌      |          ❌          |
| **Solid / SolidStart**               |     ✅     |           ❌           |     ❌     |   ❌    |      ❌      |          ❌          |
| **Astro islands**                    |     ✅     |           ❌           |     ❌     |   ❌    |      ❌      |          ❌          |
| **Edge runtime (Cloudflare/Vercel)** |     ✅     |           ❌           |  Partial   | Partial |      ✅      |       Partial        |
| **Screen-size targeting**            |     ✅     |           ❌           |     ❌     |   ❌    |      ❌      |          ❌          |
| **Route-aware debug overlay**        |     ✅     |           ❌           |     ❌     |   ❌    |      ❌      |          ❌          |
| **Deep-link variant override**       |     ✅     |           ❌           |     ❌     |   ❌    |      ❌      |          ❌          |
| **QR-code state sharing**            |     ✅     |           ❌           |     ❌     |   ❌    |      ❌      |          ❌          |
| **HMAC-signed remote config**        |     ✅     |           ❌           |     ❌     |   ❌    |      ❌      |          ❌          |
| **Crash-triggered rollback**         |     ✅     |           ❌           |     ❌     |   ❌    |  ✅ (paid)   |          ❌          |
| **Time-travel replay**               |     ✅     |           ❌           |     ❌     |   ❌    |      ❌      |          ❌          |
| **Zero telemetry by default**        |     ✅     |           ❌           |     ❌     |   ❌    |      ❌      |          ❌          |
| **SBOM + signed releases**           |     ✅     |          N/A           |     ❌     |   N/A   |     N/A      |         N/A          |

See [`docs/research/competitors.md`](./docs/research/competitors.md) for the full analysis.

---

## Supported frameworks

### Phase 1 (v0.1 — MVP)

- [`@variantlab/core`](./packages/core) — framework-agnostic engine
- [`@variantlab/react`](./packages/react) — React 18/19 bindings
- [`@variantlab/react-native`](./packages/react-native) — RN + Expo bindings + debug overlay
- [`@variantlab/next`](./packages/next) — Next.js 14/15 App Router + Pages Router
- [`@variantlab/cli`](./packages/cli) — codegen + validate + scaffold

### Phase 2 (v0.2)

- `@variantlab/remix` — Remix loaders + actions + cookie stickiness
- `@variantlab/vue` — Vue 3 composables
- `@variantlab/vanilla` — plain JS/TS, no framework
- `@variantlab/devtools` — Chrome/Firefox browser extension

### Phase 3 (v0.3)

- `@variantlab/svelte` — Svelte 5 stores + SvelteKit hooks
- `@variantlab/solid` — SolidJS signals + SolidStart
- `@variantlab/astro` — Astro integration
- `@variantlab/nuxt` — Nuxt module
- `@variantlab/storybook` — Storybook 8 addon
- `@variantlab/eslint-plugin` — lint rules
- `@variantlab/test-utils` — Jest/Vitest/Playwright helpers

### Phase 4 (v1.0)

- HMAC signing GA
- Crash rollback GA
- Time-travel debugger
- Reference remote-config Cloudflare Worker template

See [`ROADMAP.md`](./ROADMAP.md) for the full plan.

---

## Core principles

1. **Framework-agnostic core, thin adapters.** One engine, many bindings. Each adapter is < 200 LOC.
2. **Zero runtime dependencies.** No supply-chain surface in core.
3. **ESM-first, tree-shakeable, edge-compatible.** Runs everywhere JavaScript runs.
4. **Security by construction.** No `eval`, no `Function()`, no dynamic code loading. CSP-strict compatible.
5. **Declarative JSON → typed API.** The config is the contract. Codegen enforces correctness.
6. **SSR correct everywhere.** No hydration mismatches. Cookie-based stickiness opt-in.
7. **Privacy by default.** Zero telemetry, zero phone-home, zero external requests unless you ask.
8. **Docs-first development.** APIs are locked in markdown before any code is written.

Full rationale in [`docs/design/design-principles.md`](./docs/design/design-principles.md).

---

## Project status

**Alpha (v0.1.0).** [Phase 1: MVP](./docs/phases/phase-1-mvp.md) is complete. All five packages are built, tested, and versioned at `0.1.0`:

- `@variantlab/core` — config validation, targeting evaluator, 5 assignment strategies, history, kill switch, time gate, crash rollback. 0 runtime deps, < 3 KB gzipped.
- `@variantlab/react` — provider, 6 hooks, 3 components. < 2 KB gzipped.
- `@variantlab/react-native` — storage adapters (AsyncStorage, MMKV, SecureStore), deep links, debug overlay. < 4 KB gzipped.
- `@variantlab/next` — SSR support, cookie-based sticky assignment, edge middleware, App Router + Pages Router.
- `@variantlab/cli` — `init`, `generate`, `validate`, `eval` commands. Zero runtime deps.

603 tests passing across 61 test files. All size budgets enforced in CI.

The first production integration is [Drishtikon Mobile](https://github.com/drishtikon/mobile), which migrated from its hand-rolled `CardResizeModeContext` to `@variantlab/react-native` with 30 card-mode variants.

### Example apps

- [`examples/expo-app`](./examples/expo-app) — Expo + React Native with debug overlay
- [`examples/react-vite`](./examples/react-vite) — React 19 + Vite

---

## Documentation map

### Root

- [`README.md`](./README.md) — this file
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — monorepo layout, build tooling, size budgets
- [`API.md`](./API.md) — complete TypeScript API surface
- [`SECURITY.md`](./SECURITY.md) — threat model, mitigations, reporting
- [`ROADMAP.md`](./ROADMAP.md) — phased feature rollout
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — how to contribute
- [`LICENSE`](./LICENSE) — MIT

### Research (`docs/research/`)

- [`competitors.md`](./docs/research/competitors.md) — full competitor analysis
- [`bundle-size-analysis.md`](./docs/research/bundle-size-analysis.md) — how to hit < 3 KB
- [`framework-ssr-quirks.md`](./docs/research/framework-ssr-quirks.md) — per-framework SSR notes
- [`naming-rationale.md`](./docs/research/naming-rationale.md) — why "variantlab"
- [`security-threats.md`](./docs/research/security-threats.md) — threat landscape review
- [`origin-story.md`](./docs/research/origin-story.md) — the small-phone card problem that started it

### Design (`docs/design/`)

- [`design-principles.md`](./docs/design/design-principles.md) — the 8 core principles with rationale
- [`config-format.md`](./docs/design/config-format.md) — `experiments.json` specification
- [`targeting-dsl.md`](./docs/design/targeting-dsl.md) — targeting predicate language
- [`api-philosophy.md`](./docs/design/api-philosophy.md) — why the API looks the way it does

### Features (`docs/features/`)

- [`killer-features.md`](./docs/features/killer-features.md) — the 10 differentiators
- [`codegen.md`](./docs/features/codegen.md) — type generation
- [`debug-overlay.md`](./docs/features/debug-overlay.md) — runtime picker UX
- [`targeting.md`](./docs/features/targeting.md) — segmentation predicates
- [`value-experiments.md`](./docs/features/value-experiments.md) — non-render variants
- [`multivariate.md`](./docs/features/multivariate.md) — crossed experiments
- [`crash-rollback.md`](./docs/features/crash-rollback.md) — error-boundary-driven rollback
- [`qr-sharing.md`](./docs/features/qr-sharing.md) — state QR codes
- [`hmac-signing.md`](./docs/features/hmac-signing.md) — config integrity
- [`time-travel.md`](./docs/features/time-travel.md) — record + replay

### Phases (`docs/phases/`)

- [`phase-0-foundation.md`](./docs/phases/phase-0-foundation.md) — docs and design (complete)
- [`phase-1-mvp.md`](./docs/phases/phase-1-mvp.md) — core + react + react-native + next + cli (complete)
- [`phase-2-expansion.md`](./docs/phases/phase-2-expansion.md) — remix + vue + vanilla + devtools
- [`phase-3-ecosystem.md`](./docs/phases/phase-3-ecosystem.md) — svelte + solid + astro + nuxt + addons
- [`phase-4-advanced.md`](./docs/phases/phase-4-advanced.md) — HMAC + crash rollback + time travel
- [`phase-5-v1-stable.md`](./docs/phases/phase-5-v1-stable.md) — v1.0 release criteria

---

## Contributing

variantlab is in alpha and we welcome contributors. Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) and open a discussion on GitHub before filing PRs.

Good first areas to contribute:

- Try the quick-start above and report friction
- Draft a framework adapter for Phase 2 (Vue, Remix, Svelte, Solid)
- Audit the threat model in [`SECURITY.md`](./SECURITY.md)
- Add tests or improve coverage

---

## License

[MIT](./LICENSE) — free for commercial use, no strings attached. No telemetry, no "free tier", no upsell.
