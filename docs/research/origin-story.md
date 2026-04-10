# Origin story: the small-phone card problem

variantlab exists because of a very specific real-world problem we failed to solve cleanly in another project: Drishtikon Mobile, a Bengali news aggregation app.

## Table of contents

- [The problem](#the-problem)
- [What we tried](#what-we-tried)
- [Why the ad-hoc solution doesn't scale](#why-the-ad-hoc-solution-doesnt-scale)
- [The realization](#the-realization)
- [Why this is generalizable](#why-this-is-generalizable)
- [What we kept](#what-we-kept)

---

## The problem

Drishtikon has a "detailed news card" component in a vertical feed. Each card shows:

- A hero image (roughly 50% of the card height)
- The article title (2 lines max)
- A bias visualization bar (1 line, 24 px)
- 3 claims (roughly 130 px)
- 5 source avatars (roughly 90 px)
- An action bar (44 px — bookmark, share, AI chat)

On larger phones (iPhone 15 Pro, Pixel 8) the card fits comfortably. On smaller devices (iPhone SE, older Android) the card height shrinks to ~280-360 px and the content gets clipped or forces scrolling.

The "obvious fix" — shrink the image — works up to a point, but on the smallest devices the image becomes uselessly tiny and the card still clips.

We needed to test **many** layout strategies to pick the right one. We couldn't just ship one and hope. We had to put multiple side-by-side, try each on a real phone, and pick the best.

---

## What we tried

We built a homebrew runtime mode switcher:

```
src/context/CardResizeModeContext.tsx  — React Context + AsyncStorage persistence
src/components/ui/CardResizeModePicker.tsx  — floating button + bottom sheet picker
src/components/feature/news-card/DetailedCardBody.tsx  — dispatcher with 30 mode components
```

Over several hours we iterated on this:

1. First pass: 12 layout modes (responsive image, no-scroll, tap-collapse, drag-handle, bottom-sheet, parallax, title-overlay, accordion, horizontal, drag-snap, minimal, swipe-resize)
2. "Think out of the box" pass: +6 modes (auto-fit, swipe-pages, adaptive-density, focus-peek, ambient-bias, sticky-parallax)
3. "Impress me" pass: +6 modes (RSVP reader, 3D flip, liquid morph, radial wheel, breathing pulse, marquee ticker)
4. "Those don't solve my issue" pass: +6 modes (scale-to-fit, fixed-ratio-tabs, measure-drop, text-first, pip-thumbnail, single-section carousel)

Total: 30 modes switchable at runtime via a floating purple button.

All 30 modes persist to AsyncStorage. The picker is route-scoped (only shows on the feed). The current mode is surfaced in the debug overlay as a number badge.

**It works.** We can test every layout on every phone in the palm of our hand. The developer workflow is magical: change modes, feel the difference, pick a winner.

---

## Why the ad-hoc solution doesn't scale

The problem is that everything we built is:

1. **Hand-rolled** — every new experiment needs new boilerplate
2. **Single-app** — the `CardResizeModeContext` only knows about card resize modes
3. **Single-experiment** — we can't test card layout AND onboarding flow AND CTA copy at the same time
4. **Not typed** — mode strings are stringly-typed throughout the app
5. **Not persisted across reinstalls** — we lose our picks when wiping the app
6. **Not shareable** — we can't send a QA team "try mode 27 on mode 15" in a message
7. **Tied to the Drishtikon codebase** — the next app will have to build this again

And crucially:

> **The picker is better than any existing A/B testing tool we've used.** Firebase Remote Config has nothing like it. GrowthBook's dashboard is nice but doesn't let you try variants on a real device. LaunchDarkly's targeting UI is powerful but living in a browser tab instead of the app.

The *experience* of opening a real phone, shaking it, and cycling through 30 UI variants with one tap — that is the killer feature no paid tool offers.

---

## The realization

If this UX is so valuable, it shouldn't be locked to one app. It should be:

1. **Generalized** — any experiment, any variant, any framework
2. **Typed** — codegen'd IDs from a JSON config
3. **Portable** — the same picker UX on Next.js, Remix, Vue, Svelte, React Native
4. **Lightweight** — small enough to include in production builds without regret
5. **Secure** — safe enough to ship remote config over the wire
6. **Free** — because no one should pay $8.33/seat/month for what we just built in a weekend

And so: **variantlab**.

---

## Why this is generalizable

The Drishtikon problem was about layout. But every app has problems that benefit from the same workflow:

- **Onboarding flow A/B tests**: "3-step vs 1-page"
- **CTA copy tests**: "Buy now vs Get started vs Try free"
- **Pricing tests**: "$9.99 vs $14.99"
- **Color scheme tests**: "orange vs blue"
- **Feature rollouts**: "new chat UI, 10% of users"
- **Kill switches**: "disable the experimental AI tab if it crashes"
- **Copy localization tests**: "formal vs casual Bengali"
- **Layout experiments**: exactly Drishtikon's original problem

Every single one of these is a variant experiment. Every single one benefits from:

- A hand-switchable debug overlay on the device
- Type-safe IDs so typos become compile errors
- Route-aware filtering so the picker shows only what matters
- Deep-link + QR override for QA
- Crash-triggered rollback for safety

Drishtikon forced us to invent the UX. variantlab is the refactor where we unlock it for everyone.

---

## What we kept

Several design decisions in variantlab come directly from lessons learned building the ad-hoc solution:

### 1. AsyncStorage-based persistence

The ad-hoc version used AsyncStorage. variantlab ships AsyncStorage, MMKV, and SecureStore adapters out of the box, with `createMemoryStorage()` for tests.

### 2. Floating debug button

The Drishtikon picker has a floating purple button in the corner. variantlab ships the same pattern, configurable, tree-shakable, with shake-to-open as an opt-in.

### 3. Route-scoped pickers

Drishtikon's picker only appears on the feed route. variantlab generalizes this into the `routes` field on experiments and the `useRouteExperiments()` hook.

### 4. Bottom-sheet modal with rich descriptions

The Drishtikon picker bottom sheet shows the mode label + description. variantlab ships the same UX, plus search, favorites, and QR share.

### 5. One component per variant

Drishtikon's `DetailedCardBody.tsx` has a switch statement dispatching to 30 mode components. variantlab's `<Variant>` render-prop component is the generic version of this pattern.

### 6. Developer-first ergonomics

The Drishtikon picker is *fun* to use. It feels like Storybook for layouts. variantlab preserves that feel — the debug overlay is a first-class product, not an afterthought.

---

## The first migration

The first real-world user of variantlab will be Drishtikon itself. We will:

1. Replace `CardResizeModeContext` with `@variantlab/core` + `@variantlab/react-native`
2. Replace `CardResizeModePicker` with `<VariantDebugOverlay>`
3. Move the 30 mode definitions into `experiments.json`
4. Replace the dispatcher switch with `<Variant experimentId="news-card-layout">`
5. Delete ~2000 lines of hand-rolled code

This migration is the single most valuable reality check for the variantlab API. If it doesn't feel cleaner than the ad-hoc version, the API is wrong and we iterate.

---

## Lessons that shaped the architecture

1. **Runtime picker UX is the product.** Everything else — remote config, dashboards, analytics — is secondary.
2. **Route-scoping is essential.** On a big app with many experiments, showing all of them at all times is overwhelming. Filter by current route.
3. **Persistence must survive hot reload.** The developer's flow is "make a change, hot reload, re-check the mode". Lost state kills the flow.
4. **Configs are documents, not databases.** Treat `experiments.json` like a README — versioned, reviewed, diffable.
5. **Never break production by accident.** Crash-triggered rollback was born from shipping a card mode that crashed on certain article data. We want the safety net built in.
6. **Frameworks are plural now.** A React-only solution is a dead end in 2026. We use Next.js, React Native, and Vite-React in the same organization. Every real team does.

---

## See also

- [`README.md`](../../README.md) — the public pitch
- [`ROADMAP.md`](../../ROADMAP.md) — the phased plan
- [`docs/features/debug-overlay.md`](../features/debug-overlay.md) — the debug overlay design
