# Phase 0 — Foundation

**Status**: In progress
**Goal**: Lock in the design, principles, and documentation before a single line of package code is written.

## Table of contents

- [Exit criteria](#exit-criteria)
- [Deliverables](#deliverables)
- [Non-goals](#non-goals)
- [Risks and decisions](#risks-and-decisions)
- [Timeline](#timeline)
- [Open questions](#open-questions)

---

## Exit criteria

Phase 0 is done when:

1. ✅ The name is finalized and the npm + GitHub names are reserved
2. ✅ `README.md`, `ARCHITECTURE.md`, `API.md`, `SECURITY.md`, `ROADMAP.md`, `LICENSE`, `CONTRIBUTING.md` are written and reviewed
3. ✅ All research docs are written (competitors, bundle size, SSR quirks, naming, security, origin story)
4. ✅ All design docs are written (principles, config format, targeting DSL, API philosophy)
5. ✅ All feature specs are written (killer features, debug overlay, codegen, targeting, value experiments, multivariate, crash rollback, QR sharing, HMAC signing, time travel)
6. ✅ All phase plans are written (this file + phases 1-5)
7. ⬜ JSON Schema (`experiments.schema.json`) is published and tested with at least one example config
8. ⬜ The `.github/` directory has issue/PR templates
9. ⬜ A design review is held with at least 2 collaborators (self-review acceptable for solo project)
10. ⬜ No open questions remain in the design docs (or they are moved to `docs/open-questions.md`)

---

## Deliverables

### Root-level files

- `README.md` — the public pitch and quick-start
- `ARCHITECTURE.md` — monorepo layout, build tooling, dependency boundaries
- `API.md` — canonical TypeScript API surface for all packages
- `SECURITY.md` — threat model and commitments
- `ROADMAP.md` — phase-by-phase plan
- `LICENSE` — MIT
- `CONTRIBUTING.md` — contribution guide
- `CODE_OF_CONDUCT.md` — contributor covenant (add in phase 0.5)
- `experiments.schema.json` — JSON Schema for IDE validation

### Research docs (`docs/research/`)

- `competitors.md` — deep analysis of the A/B testing landscape
- `bundle-size-analysis.md` — how we hit 3 KB
- `framework-ssr-quirks.md` — per-framework SSR notes
- `naming-rationale.md` — why variantlab
- `security-threats.md` — extended security research
- `origin-story.md` — the Drishtikon card problem

### Design docs (`docs/design/`)

- `design-principles.md` — the 8 principles
- `config-format.md` — `experiments.json` specification
- `targeting-dsl.md` — predicate language semantics
- `api-philosophy.md` — why the public API looks the way it does

### Feature specs (`docs/features/`)

- `killer-features.md` — overview of the 10 differentiators
- `debug-overlay.md` — on-device picker
- `codegen.md` — JSON → TypeScript
- `targeting.md` — user guide for targeting
- `value-experiments.md` — feature flags and remote config
- `multivariate.md` — 3+ variant experiments
- `crash-rollback.md` — automatic safety net
- `qr-sharing.md` — deep link + QR state sharing
- `hmac-signing.md` — tamper-proof configs
- `time-travel.md` — history inspector

### Phase plans (`docs/phases/`)

- `phase-0-foundation.md` — this file
- `phase-1-mvp.md` — v0.1 MVP
- `phase-2-expansion.md` — v0.2 more frameworks
- `phase-3-ecosystem.md` — v0.3 tooling
- `phase-4-advanced.md` — v0.4 advanced features
- `phase-5-v1-stable.md` — v1.0 stable release

### Adapter specs (`docs/adapters/`) — added incrementally in later phases

Phase 0 only needs stubs:
- `docs/adapters/README.md` with a table of which adapters ship in which phases

---

## Non-goals

Explicitly **not** in phase 0:

- Writing any TypeScript implementation code
- Setting up the monorepo build tooling
- Publishing any package
- Running any benchmarks
- Writing any tests
- Creating a website
- Creating a logo
- Registering a Twitter/X account
- Finding users

Phase 0 is about getting the design right. Implementation comes in phase 1.

---

## Risks and decisions

### Decision: name is `variantlab`

- See `docs/research/naming-rationale.md`
- Risk: another project may squat the name before we publish. Mitigation: reserve npm and GitHub names early.

### Decision: MIT license

- Permissive enough for commercial users
- Risk: bad actors could rebrand and sell hosted versions. Mitigation: trademark the name, publish canonical builds ourselves.

### Decision: monorepo with pnpm + tsup + Biome

- See `ARCHITECTURE.md`
- Risk: monorepo tooling is fiddly. Mitigation: use off-the-shelf templates (TanStack Query's tooling is a good reference).

### Decision: zero runtime dependencies in core

- See `SECURITY.md` principle 2
- Risk: we reinvent wheels and have fewer eyes on the code. Mitigation: keep the reinvented code tiny (< 1 KB each), extensively documented, and extensively tested.

### Decision: hook-first API

- See `docs/design/api-philosophy.md`
- Risk: hook APIs are less flexible for non-React frameworks. Mitigation: every adapter wraps the underlying engine the same way; composable functions work for Vue/Svelte/Solid.

### Decision: ship documentation before code

- See `docs/design/design-principles.md` principle 8
- Risk: upfront design work feels slow. Mitigation: it's faster than writing code and rewriting it when requirements change.

---

## Timeline

Phase 0 is timebox-bounded, not feature-bounded:

- **Week 1**: Research docs (competitors, bundle size, SSR quirks, origin story)
- **Week 2**: Design docs (principles, config format, targeting DSL, API philosophy)
- **Week 3**: Feature specs (all 10 features)
- **Week 4**: Phase plans, JSON Schema, final review

This is intentionally compressed. The goal is to have a locked-in design before starting implementation, not to write every possible doc.

---

## Open questions

Resolved during phase 0:

- ✅ Name: `variantlab`
- ✅ License: MIT
- ✅ Monorepo tooling: pnpm + tsup + Biome + changesets
- ✅ Core deps: zero
- ✅ Framework support order: React → React Native → Next.js → Remix → Vue → Nuxt → Svelte → Solid → Astro → Vanilla

Moved to phase 1:

- How to structure the `@variantlab/core` exports for best tree-shaking
- Which hash algorithm for sticky assignment (sha256 vs xxhash vs murmur)
- How to handle SSR cookie parsing in edge runtimes

Deferred to post-v1.0:

- Collaborative sessions (multi-device live sync)
- Rollout curves (automatic percentage ramps over time)
- Multi-variate interactions (experiments depending on other experiments)
- Geolocation targeting

---

## Definition of done

Phase 0 is done when:

1. A first-time reader can open `README.md` and understand what variantlab is in 60 seconds
2. A potential contributor can read `CONTRIBUTING.md` + `ARCHITECTURE.md` and know how to build the project (even if they can't yet, because the code doesn't exist)
3. A security reviewer can read `SECURITY.md` + `docs/research/security-threats.md` and understand our threat model
4. A prospective user can read `docs/features/killer-features.md` and see why variantlab is better than their current tool
5. A framework author can read `docs/design/api-philosophy.md` and understand why we made the choices we did

When all 5 are true, we transition to phase 1.

---

## Transition to phase 1

The phase 1 kickoff checklist:

- [ ] Create the `variantlab` repo on GitHub
- [ ] Copy phase 0 docs into the repo
- [ ] Set up the monorepo scaffolding (pnpm, tsup, Biome, changesets)
- [ ] Create empty `packages/core/` and `packages/react/`
- [ ] Set up CI (lint, test, size-limit, typecheck)
- [ ] Publish `@variantlab/core@0.0.1-alpha.0` as a canary to test the pipeline
- [ ] Open issue #1: "Phase 1: MVP implementation"

See [`phase-1-mvp.md`](./phase-1-mvp.md) for what comes next.
