# Phase 3 — Ecosystem (v0.3)

**Status**: Not started
**Goal**: Reach every major frontend framework and ship the devtools extension.
**Target version**: `0.3.0`

## Table of contents

- [Exit criteria](#exit-criteria)
- [Framework adapters](#framework-adapters)
- [Devtools extension](#devtools-extension)
- [Meta-framework integrations](#meta-framework-integrations)
- [Quality of life](#quality-of-life)
- [Milestones](#milestones)

---

## Exit criteria

Phase 3 is done when:

1. `@variantlab/svelte` is published
2. `@variantlab/sveltekit` is published
3. `@variantlab/solid` is published
4. `@variantlab/solid-start` is published
5. `@variantlab/astro` is published
6. `@variantlab/nuxt` is published
7. `@variantlab/devtools` Chrome/Firefox extension is in beta
8. At least one community contribution has been merged
9. Adapter sizes meet budgets
10. Each adapter has a working example app
11. Documentation covers all adapters uniformly

---

## Framework adapters

### Svelte (`@variantlab/svelte`)

- [ ] `<VariantLabProvider>` component (Svelte 5 runes-ready)
- [ ] `useVariant(id)` as a Svelte store + `$` auto-subscribe
- [ ] `useVariantValue(id)` store
- [ ] `<Variant>` with named slots for each variant
- [ ] Store reactivity via engine `subscribe`
- [ ] Works on Svelte 4 and Svelte 5
- [ ] Example in `examples/svelte-app`

### SvelteKit (`@variantlab/sveltekit`)

- [ ] Server hooks (`handle`) for context extraction
- [ ] Load function helpers for SSR
- [ ] Cookie-based sticky assignment
- [ ] Edge adapter compatibility
- [ ] Example in `examples/sveltekit-app`

### Solid (`@variantlab/solid`)

- [ ] `<VariantLabProvider>` component
- [ ] `useVariant(id)` as a Solid accessor
- [ ] `useVariantValue(id)` accessor
- [ ] `<Variant>` with children-as-function signal
- [ ] Reactivity via `createSignal` bridged to engine `subscribe`
- [ ] Example in `examples/solid-app`

### SolidStart (`@variantlab/solid-start`)

- [ ] Server-side variant resolution
- [ ] `createServerAction$` integration
- [ ] Cookie-based stickiness
- [ ] Example in `examples/solid-start-app`

### Astro (`@variantlab/astro`)

- [ ] Astro integration plugin
- [ ] Server-side rendering helpers
- [ ] Client-island hydration
- [ ] Works with any framework island (React, Vue, Svelte, Solid)
- [ ] View transitions integration
- [ ] Example in `examples/astro-app`

### Nuxt (`@variantlab/nuxt`)

- [ ] Nuxt module (`addPlugin`, `addImportsDir`)
- [ ] Auto-imported composables
- [ ] Server-side rendering via `nuxt/server`
- [ ] Config pushed via runtime config
- [ ] Example in `examples/nuxt-app`

---

## Devtools extension

### Chrome / Firefox / Edge extension

- [ ] Manifest V3
- [ ] Attaches to pages with `@variantlab/react` (or other adapters) loaded
- [ ] Panel in DevTools showing:
  - [ ] Active experiments on the current page
  - [ ] Current variant of each
  - [ ] Override controls
  - [ ] History timeline
  - [ ] Config viewer
  - [ ] Context inspector
- [ ] No network calls — all local
- [ ] No data collection
- [ ] Open source in the same monorepo
- [ ] Published to Chrome Web Store + Firefox Add-ons

### Implementation sketch

The devtools extension uses the existing engine's `subscribe` + `getHistory` + `getExperiments` API. It talks to the page via `window.postMessage` and reads engine state from `window.__VARIANTLAB__` (exposed in dev builds only).

Security:

- The extension only activates on pages that explicitly expose the devtools hook
- No data leaves the browser
- Read-only by default; writes require confirmation

---

## Meta-framework integrations

### TanStack Router

- [ ] Reference integration that syncs route context with TanStack Router's navigation state
- [ ] Not a separate package — documented in `docs/adapters/tanstack-router.md`

### React Router v7

- [ ] Reference integration with `useLocation`
- [ ] Documented in `docs/adapters/react-router.md`

### Expo Router v3+

- [ ] Already covered by `@variantlab/react-native`, but document edge cases
- [ ] `docs/adapters/expo-router.md`

### Ionic + Capacitor

- [ ] Reference integration — mostly just React
- [ ] Native plugin wrapper for deep links
- [ ] `docs/adapters/ionic.md`

### Tauri

- [ ] Reference integration for Tauri apps
- [ ] Custom fetcher that reads from Tauri's filesystem API
- [ ] `docs/adapters/tauri.md`

### Electron

- [ ] Reference integration
- [ ] Main process + renderer process separation
- [ ] `docs/adapters/electron.md`

---

## Quality of life

### Storybook addon (`@variantlab/storybook`)

- [ ] Addon that lets stories select variants via toolbar
- [ ] Each story can declare its experiment dependencies
- [ ] Integrates with the existing debug overlay
- [ ] Example storybook in `examples/storybook`

### Playwright fixtures (`@variantlab/playwright`)

- [ ] Fixture for setting variants in Playwright tests
- [ ] Helper for asserting which variant is active
- [ ] Example in `examples/playwright-tests`

### Vitest matchers (`@variantlab/vitest`)

- [ ] `expect(engine).toHaveVariant("foo", "bar")`
- [ ] `expect(engine).toHaveExposed("foo")`
- [ ] Mock engine helper
- [ ] Documented in `docs/tooling/testing.md`

### MSW handlers (`@variantlab/msw`)

- [ ] Mock Service Worker handlers for remote config fetching
- [ ] Lets tests control what configs get served
- [ ] Example in `examples/msw-tests`

### `create-variantlab` scaffolder

- [ ] `npm create variantlab@latest`
- [ ] Prompts for framework, prefers sensible defaults
- [ ] Generates a working project with example experiment

---

## Milestones

### M1: Svelte + SvelteKit

- Svelte 5 runes support
- SvelteKit SSR
- Example apps
- Tests

### M2: Solid + SolidStart

- Signal-based hooks
- SSR
- Example apps
- Tests

### M3: Astro

- Integration plugin
- Island hydration
- Example app

### M4: Nuxt

- Nuxt module
- Auto-imports
- Example app

### M5: Devtools extension beta

- Manifest V3 scaffolding
- Panel UI
- Read-only support
- Chrome Web Store submission (beta channel)

### M6: QoL tools

- Storybook addon
- Playwright fixtures
- Vitest matchers
- MSW handlers
- create-variantlab

### M7: v0.3.0 release

- All adapters published
- Devtools in beta
- Changelog + migration notes

---

## Community targets

By the end of phase 3, we want:

- [ ] 10+ external contributors
- [ ] 5+ example apps in `examples/`
- [ ] 100+ GitHub stars
- [ ] 1000+ weekly downloads on npm
- [ ] 1+ blog post from a user
- [ ] 1+ conference talk (any size)

These are "hope so" targets, not gates.

---

## Risks

### Risk: framework coverage becomes a maintenance burden

Mitigation: each adapter is < 200 LOC and shares 95% of its code via `@variantlab/core`. Core changes ripple to all adapters. Adapter-specific bugs stay in adapters.

### Risk: devtools extension is harder than expected

Mitigation: ship a minimal panel first (read-only). Interactive features come later if the read-only version is useful.

### Risk: Astro's island model doesn't fit our API

Mitigation: Astro users primarily use React/Vue/Svelte inside islands. The Astro adapter is thin — it provides the Provider at the island boundary, and the framework adapter does the rest.

### Risk: Nuxt auto-imports collide with user code

Mitigation: namespace all composables under a `vl` prefix option. Users can opt out of auto-imports.

---

## Transition to phase 4

Phase 3 exits when:

- All framework adapters published
- Devtools extension in beta
- All milestones hit
- v0.3.0 published

Phase 4 adds advanced features: HMAC signing, crash rollback persistence, time travel replay, statistical features. See [`phase-4-advanced.md`](./phase-4-advanced.md).
