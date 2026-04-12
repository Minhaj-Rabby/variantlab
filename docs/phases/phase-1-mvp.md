# Phase 1 — MVP (v0.1)

**Status**: Complete (v0.1.0)
**Goal**: Ship a usable alpha that covers 80% of the value with 20% of the eventual code.
**Target version**: `0.1.0`

## Table of contents

- [Exit criteria](#exit-criteria)
- [Scope](#scope)
- [Out of scope](#out-of-scope)
- [Milestones](#milestones)
- [Package deliverables](#package-deliverables)
- [Quality bar](#quality-bar)
- [Migration target](#migration-target)

---

## Exit criteria

Phase 1 is done when:

1. `@variantlab/core` is published and has > 90% test coverage
2. `@variantlab/react` is published
3. `@variantlab/react-native` is published
4. `@variantlab/next` is published
5. `@variantlab/cli` is published with `init`, `generate`, `validate` commands
6. Drishtikon Mobile migrates from `CardResizeModeContext` to variantlab successfully
7. All size budgets are met and enforced in CI
8. A working example app exists in `examples/expo-app`
9. A second example app exists in `examples/nextjs-app`
10. The `README.md` quick-start works end-to-end on a fresh install
11. Documentation is accurate as of v0.1

---

## Scope

### Core engine (`@variantlab/core`)

- [x] `createEngine(config, options)` factory
- [x] `VariantContext` auto-population hooks (optional)
- [x] Config validation (schema, size, duplicates, defaults)
- [x] Targeting evaluator: `platform`, `appVersion`, `locale`, `screenSize`, `routes`, `userId`, `attributes`, `predicate`
- [x] Assignment strategies: `default`, `random`, `sticky-hash`, `weighted`
- [x] Mutex groups
- [x] Kill switch and archived status
- [x] Fail-open / fail-closed modes
- [x] `subscribe(listener)` for reactivity
- [x] `updateContext(partial)` for runtime context updates
- [x] `setVariant` / `clearVariant` / `resetAll`
- [x] In-memory history ring buffer
- [x] Hand-rolled semver matcher
- [x] Hand-rolled glob matcher
- [ ] Hand-rolled HMAC verifier (Web Crypto) — deferred to Phase 4
- [x] Prototype pollution guards
- [x] `Object.freeze` on loaded config

### React adapter (`@variantlab/react`)

- [x] `<VariantLabProvider engine={...} />`
- [x] `useVariant(id)` hook
- [x] `useVariantValue(id)` hook
- [x] `useExperiment(id)` hook
- [x] `useSetVariant()` hook
- [x] `useVariantLabEngine()` hook
- [x] `useRouteExperiments()` hook
- [x] `<Variant>` render-prop component
- [x] `<VariantValue>` render-prop component
- [x] `<VariantErrorBoundary>` with crash-rollback integration
- [ ] `<VariantDebugOverlay>` with overview + context tabs — deferred to Phase 2
- [x] Size: core + react < 5 KB gzipped

### React Native adapter (`@variantlab/react-native`)

- [x] All `@variantlab/react` exports re-exported
- [x] Native platform detection (`Platform.OS`)
- [x] Native screen size detection (`Dimensions`)
- [x] Native app version detection (`Constants` / `DeviceInfo`)
- [x] Native locale detection (`NativeModules` / `expo-localization`)
- [x] Router integration (Expo Router via `usePathname`)
- [x] AsyncStorage adapter
- [x] MMKV adapter
- [x] SecureStore adapter
- [x] Deep link handler via `Linking`
- [x] `<VariantDebugOverlay>` with native bottom-sheet
- [x] QR generator (hand-rolled, ~2 KB)

### Next.js adapter (`@variantlab/next`)

- [x] `createVariantLabServer(config, options)`
- [x] `getVariantSSR(id, context)` for Server Components
- [x] `<VariantLabProvider>` with `initialVariants` hydration
- [x] Cookie-based sticky assignment
- [x] `variantLabMiddleware(config)` for edge middleware
- [x] Route integration via `usePathname` from `next/navigation`
- [x] Works on both Pages Router and App Router
- [x] Works on Vercel Edge runtime

### CLI (`@variantlab/cli`)

- [x] `variantlab init` — scaffold `experiments.json` + config
- [x] `variantlab generate` — codegen TypeScript from config
- [x] `variantlab validate` — schema + semantic validation
- [x] `variantlab eval` — evaluate experiments against a test context
- [x] Exit codes per `docs/features/codegen.md`
- [x] `--watch` mode for `generate`
- [x] Size: < 50 KB (allowed to be larger than runtime)

---

## Out of scope

Explicitly **not** in phase 1:

- ❌ Vue / Nuxt / Svelte / Solid / Astro adapters (phase 2-3)
- ❌ HMAC signing CLI command (phase 4)
- ❌ Crash rollback persistence (phase 4)
- ❌ Time travel replay mode (phase 4)
- ❌ `variantlab distribution` statistical simulation (phase 2)
- ❌ Web dashboard / hosted SaaS (never)
- ❌ Telemetry forwarding (phase 2 — we ship the interface, not adapters)
- ❌ QR scanner (relies on peer deps; documented but not implemented in v0.1)
- ❌ Collaborative sessions (post-v1.0)
- ❌ Full expression language for targeting (never)

---

## Milestones

### M1: Core engine alpha

- Package skeleton
- Config loader + validator
- Targeting evaluator with all operators
- Assignment strategies
- Tests covering 80% of engine code
- Size < 3 KB

Gate: passing tests, size budget met, Drishtikon-equivalent config can be loaded.

### M2: React + React Native

- React adapter with hooks
- React Native adapter with storage + deep links
- Example Expo app
- Example Next.js app
- Tests

Gate: example apps run, hooks return correct variants, debug overlay opens on device.

### M3: Next.js + CLI

- Next.js server helpers
- CLI init / generate / validate
- Codegen emits valid TypeScript
- Works on Vercel Edge
- SSR test suite (no hydration mismatches)

Gate: deployed example on Vercel, codegen round-trips, 0 hydration warnings.

### M4: Drishtikon migration

- Replace `CardResizeModeContext` with variantlab
- Replace `CardResizeModePicker` with `<VariantDebugOverlay>`
- Move 30 card modes into `experiments.json`
- Delete ~2000 lines of hand-rolled code
- Ship to the Drishtikon app

Gate: the migration is cleaner than the original, no behavior regressions.

### M5: v0.1.0 release

- Final polish
- Migration guide for phase-1-shaped users
- Blog post announcement (optional — no marketing in phase 1)
- Publish to npm with `@0.1.0` tag

Gate: README quick-start works for a fresh user.

---

## Package deliverables

Per the [`ARCHITECTURE.md`](../../ARCHITECTURE.md) monorepo layout:

```
packages/
├── core/                @variantlab/core               ~3 KB
├── react/               @variantlab/react              ~2 KB
├── react-native/        @variantlab/react-native       ~4 KB
├── next/                @variantlab/next               ~2 KB
└── cli/                 @variantlab/cli                ~50 KB (dev-only)
```

Each package:

- Has `package.json`, `README.md`, `CHANGELOG.md`, `tsconfig.json`
- Uses `tsup` to build ESM + CJS + `.d.ts`
- Has `sideEffects: false`
- Has separate entrypoints per feature (e.g., `@variantlab/core/debug`)
- Has `engines: { "node": ">=18" }`
- Uses `peerDependencies` for framework versions

---

## Quality bar

### Testing

- Vitest for unit tests
- @testing-library/react for React hooks
- @testing-library/react-native for RN components
- Playwright for Next.js SSR tests
- Custom harness for Expo (simulator-based)

Coverage targets:

- Core: 95%
- React: 90%
- RN: 85%
- Next.js: 85%
- CLI: 80%

### Size enforcement

- `size-limit` in CI
- Fail the build if any package exceeds its budget by > 5%
- Post size delta on every PR

### Type checking

- `tsc --strict --noEmit` on every package
- `--noUnusedLocals`, `--noUnusedParameters`
- `--exactOptionalPropertyTypes`
- Zero `any` in source

### Linting

- Biome with recommended rules
- Prettier via Biome
- No eslint (Biome replaces it)

### CI checks

On every PR:

- [x] Typecheck
- [x] Lint
- [x] Unit tests
- [x] Size check
- [x] Publint (npm metadata validation)
- [x] Arethetypeswrong (export correctness)
- [x] Changesets check (has a changeset file if package changed)

---

## Migration target

The primary real-world validation of phase 1 is the Drishtikon migration. If the migration is not cleaner than the original, the API is wrong and we iterate.

### Success criteria for the migration

1. **LOC delta**: delete > 1500 LOC net
2. **Type safety**: every mode ID becomes compile-time checked
3. **Switch speed**: mode change should feel at least as instant as the original picker
4. **Dev toggle survives reload**: persistence works
5. **Zero regressions**: no visual or behavioral difference on any of the 30 modes
6. **Runtime size**: variantlab adds < 7 KB gzipped to the app bundle

See the `migration-drishtikon.md` doc to be written during M4.

---

## Risks

### Risk: the API feels wrong under real use

Mitigation: the Drishtikon migration happens inside phase 1, not after. If the API feels wrong, we change it before publishing v0.1.

### Risk: size budgets are unreachable

Mitigation: write a proof-of-concept core before committing to the full scope. If PoC is > 4 KB, rescope.

### Risk: Next.js SSR has edge cases we didn't anticipate

Mitigation: see `docs/research/framework-ssr-quirks.md`. If a new quirk appears, document it and ship a patch.

### Risk: CLI codegen breaks on unusual JSON

Mitigation: schema validation + fuzz testing of the codegen with malformed inputs.

### Risk: React 18/19 strict mode causes double rendering and duplicate assignments

Mitigation: idempotent assignment. Assigning the same variant twice is a no-op.

---

## Transition to phase 2

Phase 1 exits when:

- All exit criteria above are met
- The v0.1.0 tag is published
- The Drishtikon migration is merged and deployed
- No blocking issues are open

Phase 2 starts with: expanding framework coverage (Vue, Svelte, Solid, Remix) and adding power features (distribution CLI, better SSR, advanced targeting). See [`phase-2-expansion.md`](./phase-2-expansion.md).
