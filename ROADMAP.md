# Roadmap

variantlab ships in five phases. This document describes what each phase contains, what success looks like, and why the order was chosen. Detailed per-phase documents live in [`docs/phases/`](./docs/phases/).

## Table of contents

- [Phase 0: Foundation](#phase-0-foundation) — you are here
- [Phase 1: MVP (v0.1)](#phase-1-mvp-v01)
- [Phase 2: Expansion (v0.2)](#phase-2-expansion-v02)
- [Phase 3: Ecosystem (v0.3)](#phase-3-ecosystem-v03)
- [Phase 4: Advanced (v0.4)](#phase-4-advanced-v04)
- [Phase 5: v1.0 Stable](#phase-5-v10-stable)
- [Versioning commitments](#versioning-commitments)
- [How priorities can change](#how-priorities-can-change)

---

## Phase 0: Foundation

**Status**: In progress.

**Goal**: Lock the public API surface, document the architecture, define the threat model, and validate every design decision with writing *before* a single line of production code is written.

**Deliverables**:

- [x] `README.md` — vision and positioning
- [x] `ARCHITECTURE.md` — monorepo layout and runtime data flow
- [x] `API.md` — complete TypeScript API surface
- [x] `SECURITY.md` — threat model and mitigations
- [x] `ROADMAP.md` — this document
- [ ] `CONTRIBUTING.md` — contribution guide
- [ ] `LICENSE` — MIT
- [ ] `experiments.schema.json` — JSON Schema for the config file
- [ ] `docs/research/` — competitor analysis, bundle-size research, SSR quirks, naming rationale, security threats, origin story
- [ ] `docs/design/` — design principles, config format, targeting DSL, API philosophy
- [ ] `docs/features/` — detailed specs for all killer features
- [ ] `docs/phases/` — per-phase detailed plans
- [ ] GitHub repo created, branch protection configured, issue templates
- [ ] Design review with at least 3 external reviewers
- [ ] Naming finalized (see [`docs/research/naming-rationale.md`](./docs/research/naming-rationale.md))
- [ ] First 10 "design partners" identified — developers willing to try the MVP

**Exit criteria**:

1. Every public API in `API.md` has been reviewed by at least 2 maintainers
2. `SECURITY.md` has been reviewed by someone with security experience
3. At least 3 framework adapter specs exist (`react`, `react-native`, `next`)
4. A demo of the Drishtikon card resize use case has been sketched using the planned API
5. Naming is locked
6. GitHub repo exists with labels, milestones, and issue templates

**Non-goals**:

- Writing production code
- Setting up CI
- Publishing anything to npm

See [`docs/phases/phase-0-foundation.md`](./docs/phases/phase-0-foundation.md) for the detailed plan.

---

## Phase 1: MVP (v0.1)

**Goal**: Ship the smallest possible version that a real product can use. Prove the thesis: one core, multiple adapters, real type safety.

**Packages shipped**:

- `@variantlab/core` — engine, targeting, assignment, HMAC (but off by default)
- `@variantlab/react` — hooks, components, debug overlay
- `@variantlab/react-native` — RN bindings, AsyncStorage adapter, native debug overlay
- `@variantlab/next` — App Router + Pages Router SSR support
- `@variantlab/cli` — `init`, `generate`, `validate`

**Features shipped**:

- Inline JSON config
- `useVariant`, `useVariantValue`, `useExperiment` hooks
- `<Variant>` and `<VariantValue>` components
- Debug overlay with route-aware filtering
- Screen-size targeting
- Platform targeting
- App-version targeting (semver)
- Locale targeting
- Default + sticky-hash assignment strategies
- Deep link override (opt-in)
- Codegen for type-safe experiment IDs
- Example apps: `next-app-router`, `expo-router`, `vite-react`

**Features NOT shipped in v0.1** (deliberate):

- Remote config fetching (users can plug it themselves via `Fetcher` interface)
- HMAC signing (the API exists, but the UX + CLI tooling lands in v0.4)
- Crash-triggered rollback (the infrastructure exists, but the UX ships in v0.4)
- Time-travel replay
- QR code sharing
- Multivariate / crossed experiments
- Traffic splits beyond simple weights
- Analytics integrations

**Exit criteria**:

1. All packages shipped to npm with provenance
2. Docs site deployed at `variantlab.dev` with interactive playground
3. Drishtikon Mobile has migrated from its hand-rolled context to `@variantlab/react-native`
4. At least 5 external projects have adopted v0.1
5. Bundle sizes within budget (see [`ARCHITECTURE.md`](./ARCHITECTURE.md))
6. 95%+ test coverage on core
7. Zero runtime dependencies in core verified in CI

**Success metric**: 100 stars on GitHub within 30 days of release, 10 external integrations within 60 days.

See [`docs/phases/phase-1-mvp.md`](./docs/phases/phase-1-mvp.md).

---

## Phase 2: Expansion (v0.2)

**Goal**: Broaden framework support to cover the major meta-frameworks beyond React, and ship the browser devtools extension.

**Packages shipped**:

- `@variantlab/remix` — Remix loaders, actions, cookie stickiness
- `@variantlab/vue` — Vue 3 composables + components
- `@variantlab/vanilla` — plain JS/TS helpers, no framework
- `@variantlab/devtools` — Chrome/Firefox browser extension

**Features shipped**:

- Full Remix integration including nested route experiments
- Vue 3 composables matching the React API 1:1
- Browser devtools extension:
  - Inspect current variant assignments
  - Override variants from DevTools panel
  - Visualize targeting evaluation (why was this variant chosen)
  - Time-travel through variant changes in the current session
- Route-aware filtering in the devtools panel (matches current URL)

**Exit criteria**:

1. Example apps for Remix, Vue 3, and Nuxt (via Vue adapter) working end-to-end
2. Browser devtools extension published to Chrome Web Store and Firefox Add-ons
3. At least 10 external integrations total across all adapters

See [`docs/phases/phase-2-expansion.md`](./docs/phases/phase-2-expansion.md).

---

## Phase 3: Ecosystem (v0.3)

**Goal**: Fill out the remaining frameworks and ship the developer experience layer (lint, test utils, Storybook).

**Packages shipped**:

- `@variantlab/svelte` — Svelte 5 stores + SvelteKit hooks
- `@variantlab/solid` — SolidJS signals + SolidStart
- `@variantlab/astro` — Astro integration
- `@variantlab/nuxt` — Nuxt module
- `@variantlab/storybook` — Storybook 8 addon
- `@variantlab/eslint-plugin` — lint rules for config correctness and safe overlay imports
- `@variantlab/test-utils` — Jest/Vitest/Playwright helpers

**Features shipped**:

- Full framework parity across the JavaScript ecosystem
- Storybook addon with per-story variant override
- ESLint rules:
  - No unknown experiment IDs
  - No debug overlay in production imports
  - No missing defaults
  - No duplicate variant IDs
- Test utilities:
  - `<TestVariantProvider>` for Jest/RNTL
  - `setVariant()` imperative helper for tests
  - Playwright fixture for E2E variant overrides

**Exit criteria**:

1. All 10+ planned adapters shipped
2. Every adapter has an example app
3. ESLint plugin installed in 25+ projects
4. Compat matrix green across Node 18/20/22 and all supported framework versions

See [`docs/phases/phase-3-ecosystem.md`](./docs/phases/phase-3-ecosystem.md).

---

## Phase 4: Advanced (v0.4)

**Goal**: Ship the "killer features" that differentiate variantlab from every paid competitor.

**Features shipped**:

- **HMAC signing GA** — CLI tooling for signing + verifying configs, docs for key management, reference Cloudflare Worker remote config server
- **Crash-triggered rollback GA** — `<VariantErrorBoundary>` in all framework adapters, rollback metrics dashboard in debug overlay
- **Time-travel debugger** — record every variant change + context update, scrubber UI in devtools, export replay as JSON
- **QR code state sharing** — generate QR from debug overlay encoding current variants + context, scan via native QR reader
- **Deep link override UX** — toast notifications when deep link overrides are applied, programmatic API
- **Multivariate crossed experiments** — `layout × theme × copy` combinations, deterministic assignment
- **Weighted traffic splits** — `{ A: 25, B: 50, C: 25 }` with sticky hash
- **Holdout groups** — always-default percentage for clean measurement
- **Mutual exclusion groups** — enforce that co-running experiments don't conflict

**Exit criteria**:

1. HMAC signing works end-to-end from CLI sign → CDN deploy → client verify
2. Crash rollback has been field-tested in the Drishtikon app
3. Time-travel debugger records + replays in all major frameworks
4. Reference Cloudflare Worker template for remote config published
5. One published case study showing a crash rollback saving a production incident

See [`docs/phases/phase-4-advanced.md`](./docs/phases/phase-4-advanced.md).

---

## Phase 5: v1.0 Stable

**Goal**: Declare the API stable. Commit to semver strict. Welcome enterprise adoption.

**Deliverables**:

- **API freeze** — no breaking changes in v1.x without a 30-day RFC and major version bump
- **Third-party security audit** published
- **Reproducible builds** verified by an independent party
- **Long-term support policy** documented
- **Enterprise support tier** (community-maintained, still free — but with SLAs from a funded maintainer pool if we raise funding)
- **Case studies** from at least 10 production users across different industries
- **Benchmarks** vs paid competitors published
- **Comprehensive migration guides** from Firebase Remote Config, GrowthBook, Statsig, LaunchDarkly

**Exit criteria**:

1. Zero P0 bugs open
2. Zero known security vulnerabilities
3. Test coverage ≥ 95% across all packages
4. All documentation pages have been reviewed
5. Benchmarks show variantlab outperforms or matches paid alternatives on core metrics
6. At least 500 GitHub stars and 50 production integrations
7. Sustainable maintenance model in place

**Post-v1.0 priorities** (not a promise, a wishlist):

- Hosted docs search (Algolia DocSearch)
- Interactive learning track — "A/B testing fundamentals with variantlab"
- Conference talk submissions
- Community plugin registry
- Reference dashboards for common observability stacks (Grafana, Datadog, PostHog)

See [`docs/phases/phase-5-v1-stable.md`](./docs/phases/phase-5-v1-stable.md).

---

## Versioning commitments

| Version range | Stability | Breaking changes |
|---|---|---|
| 0.0.x | Experimental | Any time |
| 0.1.x - 0.4.x | Beta | Minor versions can break |
| 0.5.x - 0.9.x | Release candidate | Patch versions can break only for security |
| 1.0.0+ | Stable | Semver strict — major version required for breaks |

**From v0.5 onward** we commit to never breaking without a deprecation warning shipped in at least one prior minor version.

**From v1.0 onward** we commit to:

- Semver strict
- Minimum 30-day RFC for breaking changes
- Minimum 12-month deprecation window for removed APIs
- Migration codemods for major-version upgrades

---

## How priorities can change

This roadmap is a plan, not a contract. Priorities shift based on:

1. **User feedback** — if the community tells us a framework is critical, we'll reshuffle
2. **Security issues** — critical vulnerabilities always jump the queue
3. **Funding** — if funding lands, paid features from Phase 4 may ship earlier
4. **Blocking issues** — some features depend on upstream framework changes

We will document every roadmap change in a public GitHub discussion with justification.

---

## See also

- [`docs/phases/phase-0-foundation.md`](./docs/phases/phase-0-foundation.md)
- [`docs/phases/phase-1-mvp.md`](./docs/phases/phase-1-mvp.md)
- [`docs/phases/phase-2-expansion.md`](./docs/phases/phase-2-expansion.md)
- [`docs/phases/phase-3-ecosystem.md`](./docs/phases/phase-3-ecosystem.md)
- [`docs/phases/phase-4-advanced.md`](./docs/phases/phase-4-advanced.md)
- [`docs/phases/phase-5-v1-stable.md`](./docs/phases/phase-5-v1-stable.md)
