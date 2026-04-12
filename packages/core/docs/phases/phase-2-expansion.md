# Phase 2 — Expansion (v0.2)

**Status**: Not started
**Goal**: Broaden framework coverage and add power-user features that didn't make the MVP cut.
**Target version**: `0.2.0`

## Table of contents

- [Exit criteria](#exit-criteria)
- [Scope](#scope)
- [New packages](#new-packages)
- [Core improvements](#core-improvements)
- [CLI improvements](#cli-improvements)
- [Documentation](#documentation)
- [Milestones](#milestones)

---

## Exit criteria

Phase 2 is done when:

1. `@variantlab/remix` is published and tested in a production-style example
2. `@variantlab/vue` is published with a composition API that matches the hooks API
3. `@variantlab/vanilla` (framework-free) is published
4. Devtools browser extension scaffolding exists (beta)
5. Telemetry interface is finalized and at least one reference adapter is shipped
6. `variantlab distribution` simulation command works
7. Core supports server-sent events (SSE) for live config push (optional)
8. All framework examples still pass CI
9. Migration from v0.1 → v0.2 is documented

---

## Scope

### Remix adapter (`@variantlab/remix`)

- [ ] Server helpers: `getVariantLoader`, `variantLabMiddleware`
- [ ] `<VariantLabProvider>` with loader data hydration
- [ ] Cookie-based sticky assignment (reuses Next.js adapter logic)
- [ ] Works on Remix SPA mode and SSR mode
- [ ] Example app in `examples/remix-app`

### Vue adapter (`@variantlab/vue`)

- [ ] `<VariantLabProvider>` component
- [ ] `useVariant(id)` composable
- [ ] `useVariantValue(id)` composable
- [ ] `useExperiment(id)` composable
- [ ] `useRouteExperiments()` composable
- [ ] `<Variant>` component with slots
- [ ] Reactivity via Vue's `ref`/`computed` bridged to engine `subscribe`
- [ ] Nuxt module in a separate package (phase 3)

### Vanilla adapter (`@variantlab/vanilla`)

- [ ] No framework dependency
- [ ] Imperative API: `getVariant`, `getVariantValue`, `setVariant`
- [ ] DOM helpers: `bindElement(id, ...)` for vanilla-JS sites
- [ ] Storage adapter for localStorage / sessionStorage
- [ ] Route watcher for `popstate` + `hashchange`
- [ ] Example in `examples/vanilla-app` (a static HTML file)

---

## New packages

| Package | Size | Notes |
|---|---|---|
| `@variantlab/remix` | ~3 KB | Extends core with Remix-specific loaders |
| `@variantlab/vue` | ~2 KB | Composition API; hooks with same names as React |
| `@variantlab/vanilla` | ~1 KB | Framework-free |
| `@variantlab/telemetry-console` | ~0.5 KB | Reference telemetry adapter that logs to console |
| `@variantlab/devtools` | Deferred | Chrome/Firefox extension — beta only |

---

## Core improvements

### Targeting enhancements

- [ ] Wildcard prefix matching for locale (`"en*"`)
- [ ] `appVersion` prerelease support (`>=2.0.0-beta.1`)
- [ ] `attributes` key globs (`"plan*"`)

These are backward-compatible additions; existing configs still work.

### Config improvements

- [ ] Support `include` field to split configs across files (`experiments/*.json` merged into one)
- [ ] Support `$ref` for variant value reuse
- [ ] Per-experiment `startDate`/`endDate` fractional support (interpolate rollout over time)

### Assignment

- [ ] New strategy: `sticky-session` — same variant for the entire session, re-assigned on new session
- [ ] New strategy: `sticky-device` — per-device stickiness using a generated device ID
- [ ] Configurable bucket resolution (100 buckets → 10000 buckets for fine-grained splits)

### Telemetry

- [ ] Finalize `Telemetry` interface
- [ ] Ship reference implementations:
  - `@variantlab/telemetry-console` — logs to console
  - `@variantlab/telemetry-posthog` — for PostHog (user hosts their own PostHog)
- [ ] Document how to integrate with Mixpanel, Amplitude, Segment, custom webhooks

### Live config push

- [ ] SSE-based `createEventSourceFetcher` for push updates
- [ ] WebSocket-based `createWebSocketFetcher` (optional)
- [ ] Config change events surface in debug overlay

This is optional — most users can poll every 60s.

---

## CLI improvements

### `variantlab distribution`

Simulate variant distribution for a config:

```bash
variantlab distribution experiments.json \
  --experiment cta-copy \
  --users 10000
```

Output: table of variant IDs with actual/expected percentages. Useful for verifying splits.

### `variantlab eval`

Add filtering and batch mode:

```bash
variantlab eval experiments.json \
  --experiments cta-copy,card-layout \
  --context-file ./test-contexts.json
```

### `variantlab diff`

Compare two configs:

```bash
variantlab diff old.json new.json
```

Shows added/removed/changed experiments.

### `variantlab migrate`

Upgrade configs across major versions (placeholder for future):

```bash
variantlab migrate --from 1 --to 2 experiments.json
```

---

## Documentation

### Migration guides

- `docs/migrations/v0.1-to-v0.2.md` — what changed, what to update
- `docs/migrations/from-firebase.md` — migrating from Firebase Remote Config
- `docs/migrations/from-growthbook.md` — migrating from GrowthBook
- `docs/migrations/from-launchdarkly.md` — migrating from LaunchDarkly

### Adapter cookbooks

- `docs/adapters/remix.md`
- `docs/adapters/vue.md`
- `docs/adapters/vanilla.md`

Each cookbook shows:

- Install
- Provider setup
- Using hooks/composables
- SSR pattern
- Debug overlay integration
- Common pitfalls

### Tutorial

- `docs/tutorial/first-experiment.md` — a 10-minute walkthrough for new users
- `docs/tutorial/multivariate-layout.md` — building a Drishtikon-style layout test
- `docs/tutorial/feature-flags.md` — using variantlab as feature flags

---

## Milestones

### M1: Remix adapter

- Package scaffolding
- Loader-based SSR
- Cookie handling
- Example app
- Tests

Gate: example deployed to Remix's deploy target, no hydration issues.

### M2: Vue adapter

- Package scaffolding
- Composition API composables
- Component shims
- Example SFC app (Vite + Vue)
- Tests

Gate: composables reactive, debug overlay renders in Vue.

### M3: Vanilla adapter

- Framework-free core wrapper
- DOM bindings
- Example static HTML
- Tests

Gate: static example works in all evergreen browsers.

### M4: CLI distribution + diff + migrate

- `distribution` command with statistical output
- `diff` command with readable delta
- `migrate` command stub (no actual migrations yet)
- Tests

Gate: CLI commands exit with correct codes on all expected inputs.

### M5: Telemetry interface + reference adapters

- Finalize `Telemetry` interface (no breaking changes in phase 3+)
- Ship console adapter
- Ship posthog adapter
- Integration tests

Gate: end-to-end telemetry flow from hook call → posthog event.

### M6: Live config push (optional)

- SSE fetcher
- Event subscription in debug overlay
- Example with a small SSE server

Gate: a config change on the server appears in the app within 1 second. This is optional; if it adds > 500 bytes to core, defer to phase 3.

### M7: v0.2.0 release

- Changeset + changelog
- Migration guides
- Publish to npm

Gate: all new packages pass size checks, tests, and publint.

---

## Non-goals

Explicitly **not** in phase 2:

- ❌ Svelte / SvelteKit (phase 3)
- ❌ Solid / SolidStart (phase 3)
- ❌ Astro (phase 3)
- ❌ Nuxt module (phase 3)
- ❌ HMAC signing (phase 4)
- ❌ Crash rollback persistence (phase 4)
- ❌ Time travel replay (phase 4)
- ❌ Devtools full implementation (phase 3)
- ❌ Hosted dashboard (never)

---

## Risks

### Risk: Vue reactivity doesn't map cleanly to `subscribe`

Mitigation: study how Pinia and VueUse bridge external state. If hooks feel wrong in Vue, we adjust the composable shapes without touching core.

### Risk: Remix loader + client variant mismatch

Mitigation: strict cookie-based stickiness. The loader sets the cookie, the client reads it. No client-side randomness.

### Risk: Telemetry interface is wrong and we can't change it

Mitigation: finalize only after shipping 2 reference adapters that use it. If both work, the interface is probably right.

### Risk: Scope creep

Mitigation: strict "phase 2 is only these items" discipline. New ideas go to phase 3 or later.

---

## Transition to phase 3

Phase 2 exits when:

- All exit criteria met
- v0.2.0 is tagged and published
- Migration guides written
- No regressions in phase 1 packages

Phase 3 starts with: the remaining framework ecosystem (Svelte, Solid, Astro, Nuxt) and full devtools. See [`phase-3-ecosystem.md`](./phase-3-ecosystem.md).
