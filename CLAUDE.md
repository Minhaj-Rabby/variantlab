# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status: Phase 0 (docs-only, pre-alpha)

**There is no source code in this repository yet.** No `packages/`, no `apps/`, no `package.json`, no build tooling. Every path referenced in `ARCHITECTURE.md` under `packages/*` and `apps/*` is aspirational and does not exist on disk.

This is intentional — the project is in [Phase 0: Foundation](./docs/phases/phase-0-foundation.md), where the entire API surface, threat model, and design are locked in markdown *before* any TypeScript is written. See `CONTRIBUTING.md`: PRs that add a `src/` file during Phase 0 are closed on sight.

Practical implications for working in this repo:

- Do not run `pnpm install`, `pnpm build`, or `pnpm test` — there is nothing to build or test. The commands documented in `CONTRIBUTING.md` describe the *future* Phase 1+ workflow.
- Do not scaffold packages, `tsconfig.json`, or CI workflows unless the user explicitly asks to begin Phase 1.
- Edits in this phase are almost always to markdown files. Treat `README.md`, `ARCHITECTURE.md`, `API.md`, `SECURITY.md`, and the `docs/` tree as the product.
- When asked to add a feature, the correct deliverable is usually a new or updated spec under `docs/features/`, `docs/design/`, or `docs/adapters/` — not code.

## Documentation topology

The docs are deliberately structured so each concern lives in exactly one place. When making a change, update the authoritative source and any docs that cross-reference it:

- **Root markdown** — `README.md` (pitch), `ARCHITECTURE.md` (monorepo + runtime data flow), `API.md` (canonical TypeScript surface), `SECURITY.md` (threat model), `ROADMAP.md` (phased plan), `CONTRIBUTING.md`, `LICENSE`, `experiments.schema.json` (JSON Schema for `experiments.json`).
- **`docs/research/`** — external/empirical inputs (competitors, bundle-size analysis, SSR quirks, naming, security threats, origin story). New research goes here.
- **`docs/design/`** — normative design decisions (`design-principles.md` is the 8 principles, `config-format.md`, `targeting-dsl.md`, `api-philosophy.md`). These are the "why".
- **`docs/features/`** — per-feature specs for the 10 killer features (codegen, debug overlay, targeting, value experiments, multivariate, crash rollback, QR sharing, HMAC signing, time travel). Each is self-contained.
- **`docs/phases/`** — phase-by-phase execution plan (phase 0 current, 1 MVP, 2 expansion, 3 ecosystem, 4 advanced, 5 v1.0). `phase-1-kickoff-prompts.md` contains the prompts intended to kick off implementation.
- **`docs/adapters/`** — per-framework adapter specs (stubs in Phase 0, filled in later phases).

`CONTRIBUTING.md` states the cross-cutting rule: API changes land in `API.md` first, feature changes update the corresponding `docs/features/*.md`, architecture changes update `ARCHITECTURE.md`. Keep these in sync in the same change.

## Core architectural invariants (when code eventually lands)

Any implementation work — whenever Phase 1 begins — must preserve these non-negotiables from `ARCHITECTURE.md` and `docs/design/design-principles.md`:

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
- **Changesets** will be required for any PR touching public APIs once Phase 1 begins; docs-only PRs do not need them.
- **Package naming**: everything user-facing is `@variantlab/<name>`. The CLI binary is `variantlab`.
- **Config file of record** is `experiments.json`, validated against `experiments.schema.json` at the repo root.
