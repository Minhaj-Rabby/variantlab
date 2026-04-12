# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status: Phase 1 (MVP in progress)

Phase 0 is complete — the docs under `README.md`, `ARCHITECTURE.md`, `API.md`, `SECURITY.md`, `ROADMAP.md`, and the `docs/` tree are the locked design. The project is now in [Phase 1: MVP](./docs/phases/phase-1-mvp.md), building the packages described in `ARCHITECTURE.md`. Nothing has been published to npm yet; every package `version` is still `0.0.0`.

On-disk reality (keep this section accurate as work lands):

- `packages/core/` — substantial. Config loader/validator (`config/`), targeting evaluator with operators for platform, appVersion, locale, screenSize, routes, userId, attributes (`targeting/`), assignment strategies default/random/sticky-hash/weighted/mutex (`assignment/`), history ring buffer (`history/`), engine primitives create/subscribe/kill-switch/time-gate/crash-counter (`engine/`). Unit tests sit alongside each module under `__tests__/`. Predicate targeting, HMAC verifier, and explicit prototype-pollution guards are still TBD.
- `packages/react/` — provider/context, hooks (`use-variant`, `use-variant-value`, `use-experiment`, `use-set-variant`, `use-variant-lab-engine`, `use-route-experiments`), components (`<Variant>`, `<VariantValue>`, `<VariantErrorBoundary>`), with tests including a strict-mode suite. `<VariantDebugOverlay>` is not yet implemented.
- `packages/react-native/` — storage adapters (memory, AsyncStorage, MMKV, SecureStore), deep-link handling, debug overlay, QR helper.
- `packages/next/` — **stub only** (`src/index.ts` exports a `VERSION` constant). M3 has not started.
- `packages/cli/` — **stub only**. `init`/`generate`/`validate`/`eval` are not implemented.
- `examples/expo-app` and `examples/react-vite` exist. `examples/nextjs-app` (called out in the Phase 1 exit criteria) does not yet exist.
- The workspace uses `packages/*` and `examples/*` in `pnpm-workspace.yaml` — there is no `apps/` directory. Any reference to `apps/` in older docs is historical.

Practical implications for working in this repo:

- `pnpm install`, `pnpm -r build`, `pnpm test`, and `pnpm typecheck` are all valid now. Vitest runs via `vitest run` at the root; `vitest.config.ts` aliases workspace packages so tests resolve from source.
- Scaffolding new packages, adding `tsconfig.json`s, wiring `tsup`, and evolving `.github/workflows/ci.yml` are in scope. The current active milestones are finishing M1/M2 polish and starting M3 (Next.js adapter + CLI).
- Docs and code must stay in sync: `API.md`, `ARCHITECTURE.md`, and the relevant `docs/features/*.md` remain the authoritative spec. If code diverges from a spec, update the spec in the same change (per `CONTRIBUTING.md`).
- Phase 1 exit criteria and milestones live in `docs/phases/phase-1-mvp.md`. Consult that file before picking up new work.

## Documentation topology

The docs are deliberately structured so each concern lives in exactly one place. When making a change, update the authoritative source and any docs that cross-reference it:

- **Root markdown** — `README.md` (pitch), `ARCHITECTURE.md` (monorepo + runtime data flow), `API.md` (canonical TypeScript surface), `SECURITY.md` (threat model), `ROADMAP.md` (phased plan), `CONTRIBUTING.md`, `LICENSE`, `experiments.schema.json` (JSON Schema for `experiments.json`).
- **`docs/research/`** — external/empirical inputs (competitors, bundle-size analysis, SSR quirks, naming, security threats, origin story). New research goes here.
- **`docs/design/`** — normative design decisions (`design-principles.md` is the 8 principles, `config-format.md`, `targeting-dsl.md`, `api-philosophy.md`). These are the "why".
- **`docs/features/`** — per-feature specs for the 10 killer features (codegen, debug overlay, targeting, value experiments, multivariate, crash rollback, QR sharing, HMAC signing, time travel). Each is self-contained.
- **`docs/phases/`** — phase-by-phase execution plan (0 foundation complete, 1 MVP current, 2 expansion, 3 ecosystem, 4 advanced, 5 v1.0). `phase-1-kickoff-prompts.md` contains the prompts that kicked off Phase 1 implementation.
- **`docs/adapters/`** — per-framework adapter specs (stubs in Phase 0, filled in later phases).

`CONTRIBUTING.md` states the cross-cutting rule: API changes land in `API.md` first, feature changes update the corresponding `docs/features/*.md`, architecture changes update `ARCHITECTURE.md`. Keep these in sync in the same change.

## Core architectural invariants

Any implementation work must preserve these non-negotiables from `ARCHITECTURE.md` and `docs/design/design-principles.md`:

1. **`@variantlab/core` has zero runtime dependencies, forever.** Enforced by `tools/scripts/check-deps.js` in CI. This is why the project plans to hand-roll its own schema validator, semver matcher, glob matcher, and hash function rather than pull in zod/semver/minimatch/murmurhash. Do not suggest adding a runtime dep to core.
2. **Core imports no framework and no platform globals.** Allowed globals: `crypto` (Web Crypto), `Date`, `Math`, `Map`, `Set`. Forbidden: `window`, `document`, `localStorage`, `fetch`, `process`, anything from `node:*`. IO is injected via `Storage`, `Fetcher`, `Telemetry` interfaces.
3. **Each framework adapter is a thin wrapper** (< 200 LOC, < 2 KB gz). They depend only on `@variantlab/core` plus the framework as a peer dep.
4. **Size budgets are CI-enforced** via `size-limit`: core ≤ 3 KB gz, most adapters ≤ 1.5–2 KB gz, react-native ≤ 4 KB gz. PRs that bust the budget are blocked.
5. **ESM-first, `"sideEffects": false`, ES2020 target, no `eval`/`Function()`/dynamic `import()` on config data.** CSP-strict compatible.
6. **Zero telemetry by default.** Core makes no network calls on its own. This is a product promise in `README.md` and `SECURITY.md`, not just a preference.
7. **Deterministic bucketing.** Same `userId` + experiment must resolve to the same variant across every runtime. Hash algorithm choice is deferred to Phase 1 (see `phase-0-foundation.md` open questions).
8. **SSR correctness is load-bearing.** No hydration mismatches in Next App Router, Remix, SvelteKit, SolidStart, Nuxt. Cookie stickiness is opt-in.

The runtime data flow (app → adapter → engine → injected Storage/Fetcher/Telemetry/Crypto) is diagrammed in `ARCHITECTURE.md`. The hot path `engine.getVariant()` must be O(1) and check, in order: in-memory overrides → persisted assignment → targeting → assignment strategy → persist → emit.

## Conventions

- **Conventional Commits with scopes** per `CONTRIBUTING.md`: `feat|fix|docs|refactor|perf|test|chore|security(scope): description`. Scopes are package names (`core`, `react`, `react-native`, `next`, `cli`, …) or `docs`/`ci`. The existing commit `docs: phase 0 foundation — research, design, features, phases` follows this.
- **Changesets** are required for any PR touching public APIs in Phase 1 and beyond; docs-only PRs do not need them.
- **Package naming**: everything user-facing is `@variantlab/<name>`. The CLI binary is `variantlab`.
- **Config file of record** is `experiments.json`, validated against `experiments.schema.json` at the repo root.
