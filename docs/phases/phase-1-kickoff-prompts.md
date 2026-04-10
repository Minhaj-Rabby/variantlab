# Phase 1 kickoff prompts

Copy-paste prompts for each phase 1 milestone. One fresh Claude Code session per prompt. Default model: **Opus 4.6** unless marked otherwise.

## How to use this file

1. `cd` into the `variantlab` repo in a terminal
2. Run `claude` to start a fresh session
3. Copy the prompt for the next milestone and paste it
4. Let Claude work. Review the output.
5. Commit when the milestone passes its gate (see [`phase-1-mvp.md`](./phase-1-mvp.md))
6. `/exit` and start a fresh session for the next milestone

**Why fresh sessions per milestone?** Smaller context = faster responses, lower quota burn, fewer hallucinated "I remember we discussed this earlier" mistakes. Each milestone is self-contained.

**Model switching**: start with Opus by default. Switch to Sonnet mid-session with `/model sonnet` if Claude is being slow on mechanical work. Switch back with `/model opus` for tricky bits.

---

## Prerequisites (do this ONCE before session 1)

Before starting any prompts below, manually:

1. Create the GitHub repo: `gh repo create variantlab --public --description "One config. Every framework. Zero lock-in. Type-safe A/B testing that runs everywhere."`
2. Clone it locally
3. Copy the phase 0 docs (everything currently in `/Users/minhajulislamtapadar/WorkSpace/variantlab/`) into the new repo
4. Initial commit: `git add . && git commit -m "docs: phase 0 foundation" && git push`
5. Open the repo in Cursor / VS Code / your editor
6. Run `claude` in the repo root

Once the repo is set up with phase 0 docs committed, start session 1.

---

## Session 1 — Monorepo scaffolding (Opus)

**Goal**: Set up the empty monorepo structure. No engine code yet.

**Gate**: `pnpm install` succeeds, `pnpm build` produces empty but valid package outputs, `pnpm lint` passes, CI runs on a dummy commit.

```
Read docs/phases/phase-1-mvp.md and ARCHITECTURE.md. Then scaffold
the variantlab monorepo with:

1. pnpm workspaces (pnpm-workspace.yaml)
2. Root package.json with scripts: build, test, lint, typecheck, size
3. Biome for lint + format (biome.json at root, no eslint/prettier)
4. Changesets for versioning (.changeset/ directory + config)
5. tsup for build (tsup.config.ts in each package)
6. vitest for testing (vitest.config.ts at root with workspace resolution)
7. size-limit for bundle size enforcement (.size-limit.json at root)
8. TypeScript strict mode (tsconfig.base.json extended per package)

Create empty package skeletons for:
- packages/core/         (@variantlab/core)
- packages/react/        (@variantlab/react)
- packages/react-native/ (@variantlab/react-native)
- packages/next/         (@variantlab/next)
- packages/cli/          (@variantlab/cli)

Each package needs:
- package.json with correct name, version 0.0.0, type: module,
  sideEffects: false, exports map, peerDependencies as per ARCHITECTURE.md
- tsconfig.json extending the base
- tsup.config.ts
- src/index.ts with a single placeholder export: `export const VERSION = "0.0.0";`
- README.md stub pointing back to the root README

Set up .github/workflows/ci.yml with jobs for:
- lint (biome check)
- typecheck (tsc --noEmit)
- test (vitest run)
- build (tsup via pnpm -r build)
- size (size-limit)
Use pnpm/action-setup@v3 and actions/setup-node@v4 with node 20.

Add .github/ISSUE_TEMPLATE/bug_report.md, feature_request.md, and
.github/PULL_REQUEST_TEMPLATE.md.

Add a root .gitignore covering node_modules, dist, .turbo, coverage,
.DS_Store, *.log.

Do NOT write any engine, adapter, or CLI logic yet. This session is
scaffolding only. Verify pnpm install + pnpm build + pnpm lint all
succeed before finishing.
```

**After session**: commit `chore: scaffold monorepo`, push, verify CI passes on GitHub.

---

## Session 2 — Core: config loader + validator (Opus)

**Goal**: Load and validate `experiments.json` per the spec.

**Gate**: 95%+ test coverage on `packages/core/src/config/`, all validation rules enforced, `Object.freeze` applied, bundle size under 1 KB for this module.

```
Read docs/design/config-format.md, docs/design/design-principles.md
(principle 4: security by construction, principle 5: declarative JSON),
and experiments.schema.json.

Implement the config loader and validator in packages/core/src/config/
with these files:

- types.ts — ExperimentsConfig, Experiment, Variant, Targeting,
  Rollback interfaces matching the TypeScript types in API.md
- validator.ts — validateConfig(input: unknown): ExperimentsConfig
  that throws ConfigValidationError with an issues[] array on failure
- errors.ts — ConfigValidationError class extending Error
- freeze.ts — deepFreeze utility using Object.freeze recursively
- canonical.ts — canonicalStringify for deterministic JSON (keys sorted)
- index.ts — barrel export

Validation rules to enforce (from config-format.md "Validation rules"):
1. version must be exactly 1
2. Config size <= 1 MB (check the stringified input length)
3. experiments array max 1000 entries
4. Each experiment id matches /^[a-z0-9][a-z0-9-]{0,63}$/
5. No duplicate experiment ids
6. Each experiment has 2-100 variants
7. Each variant id matches same regex; no duplicates within an experiment
8. default must match one of variants[].id
9. If assignment === "weighted", split must be defined, all variant ids
   must appear in split, values must be integers 0-100 summing to exactly 100
10. Reject keys "__proto__", "constructor", "prototype" anywhere
    (walk the parsed tree after JSON.parse, using Object.create(null)
    for the result)
11. Valid ISO 8601 for startDate/endDate if present
12. Targeting nesting depth <= 10 levels
13. Glob patterns in routes compile without error (stub the compiler
    for now; real globs land in session 3)
14. Semver ranges in appVersion parse without error (stub for now)

Freeze the returned config deeply so no runtime mutation is possible.

Collect ALL validation errors into issues[] before throwing — do not
fail fast. Each issue should have: path (JSON pointer), code, message.

Write tests in packages/core/src/config/__tests__/:
- valid-config.test.ts — happy paths for every example in config-format.md
- invalid-config.test.ts — one failing test per rule above
- prototype-pollution.test.ts — crafted __proto__/constructor payloads
- freeze.test.ts — verify mutation throws in strict mode
- size-limit.test.ts — 1 MB + 1 byte should reject
- canonical.test.ts — key ordering is stable across input ordering

Target: 95%+ coverage on config/. Run `pnpm --filter @variantlab/core
test` and confirm all tests pass. Run `pnpm --filter @variantlab/core
size` and confirm config/ is under 1 KB gzipped (measure via a fake
entrypoint that only exports from config/).
```

**After session**: commit `feat(core): config loader + validator`, push.

---

## Session 3 — Core: targeting evaluator (Opus)

**Goal**: Evaluate every targeting operator + hand-rolled semver + glob.

**Gate**: 95%+ coverage, every operator in `targeting-dsl.md` implemented, `explain()` works, combined size (config + targeting) under 2 KB gzipped.

```
Read docs/design/targeting-dsl.md, docs/features/targeting.md, and
docs/research/bundle-size-analysis.md (sections on hand-rolled matchers).

Implement the targeting evaluator in packages/core/src/targeting/:

- types.ts — VariantContext, TargetingResult interfaces
- semver.ts — hand-rolled semver matcher supporting:
    comparators (=, <, <=, >, >=), caret (^1.2.0), tilde (~1.2.0),
    ranges (1.2.0 - 2.0.0), compound (>=1 <2), OR ranges (|| between)
    Do NOT support prereleases, build metadata, or x-wildcards.
    Size budget: ~250 bytes gzipped.
- glob.ts — hand-rolled glob matcher supporting:
    exact, /blog/*, /docs/**, /user/:id patterns.
    Trailing slash insensitive.
    Pre-compile patterns to avoid runtime regex backtracking.
    Size budget: ~150 bytes gzipped.
- operators/platform.ts — set membership
- operators/app-version.ts — uses semver.ts
- operators/locale.ts — prefix + exact match
- operators/screen-size.ts — set membership
- operators/routes.ts — uses glob.ts
- operators/user-id.ts — list match + sha256 hash bucket (Web Crypto)
- operators/attributes.ts — exact match on scalar values
- evaluator.ts — main evaluate(targeting, context) returning
    { matched: boolean; reason?: string } — short-circuit in the
    evaluation order from targeting-dsl.md section "Evaluation order"
- explain.ts — explain(experiment, context) returning a full trace
- index.ts — barrel export

Implementation requirements:
- No regex in the hot path (pre-compile at config load)
- No allocations after warmup (reuse arrays where possible)
- All sha256 via globalThis.crypto.subtle (Web Crypto API)
- Predicate function is ANDed last, runs only if other fields pass
- Unspecified context fields make specified targeting fields fail

Tests in packages/core/src/targeting/__tests__/:
- semver.test.ts — at least 30 cases covering all supported syntax,
  plus rejection cases for unsupported syntax
- glob.test.ts — at least 20 cases including edge cases like empty
  path, trailing slashes, consecutive slashes
- operators/*.test.ts — one file per operator with match + no-match cases
- evaluator.test.ts — combined targeting (multiple operators ANDed),
  short-circuit behavior, order verification
- explain.test.ts — trace output for passing + failing targetings

Run the full test suite. Run size check. Confirm config + targeting
combined under 2 KB gzipped.
```

**After session**: commit `feat(core): targeting evaluator with hand-rolled semver/glob`, push.

---

## Session 4 — Core: assignment strategies + engine (Opus)

**Goal**: Wire assignment strategies into a working engine with subscribe/history/context updates.

**Gate**: Distribution test passes (10k users within 2% of configured split), core package size under 3 KB gzipped, 95%+ coverage.

```
Read docs/design/config-format.md (assignment field), API.md
(VariantEngine interface), and docs/phases/phase-1-mvp.md (exit criteria).

Implement the remaining core engine in packages/core/src/:

- assignment/default.ts — always returns the default variant
- assignment/random.ts — seeded random keyed on (userId, experimentId)
    using sha256 for determinism. NEVER use Math.random in hot paths.
- assignment/sticky-hash.ts — sha256(userId + ":" + experimentId),
    convert first 4 bytes to uint32, mod by variant count, map to
    sorted variant ids (stable)
- assignment/weighted.ts — sha256 hash converted to 0-9999 bucket,
    walk the split cumulatively to find which variant owns the bucket
- assignment/mutex.ts — resolve mutex groups: user matches multiple
    experiments in the same mutex group, pick one by
    sha256(userId + ":" + mutexGroup) mod groupSize, exclude others
- history/ring-buffer.ts — fixed-size ring buffer with push + toArray,
    default size 500, bounded memory
- history/events.ts — HistoryEvent discriminated union per
    docs/features/time-travel.md
- engine/create.ts — createEngine(config, options) factory
- engine/engine.ts — VariantEngine class implementing API.md:
    getVariant, getVariantValue, setVariant, clearVariant, resetAll,
    getExperiments, subscribe, updateContext, loadConfig, reportCrash,
    getHistory, dispose
    Assignment cache keyed by (userId, experimentId) invalidated on
    context change or config reload.
- engine/crash-counter.ts — in-memory crash counter for rollback
    (persistence deferred to phase 4)
- engine/kill-switch.ts — honor top-level enabled: false and
    per-experiment status: "archived"
- engine/time-gate.ts — honor startDate/endDate
- engine/subscribe.ts — simple listener set with unsubscribe
- index.ts — public API exports: createEngine, types, ConfigValidationError

Requirements:
- Fail-open by default: any error during resolution returns the
  experiment's default variant and logs a warning via console.warn
- Fail-closed mode throws: accept { failMode: "open" | "closed" } option
- Frozen config after load
- No Math.random anywhere in the hot path
- No Date.now in the hot path (snapshot at boundaries only)
- Subscribe listeners fire on: loadConfig, updateContext, setVariant,
  clearVariant, resetAll, rollback

Tests in packages/core/src/__tests__/:
- assignment/default.test.ts
- assignment/random.test.ts — determinism across calls, distribution
  over 10k users
- assignment/sticky-hash.test.ts — same user always same variant
- assignment/weighted.test.ts — distribution test, 10k simulated users,
  each variant within 2% of configured split
- assignment/mutex.test.ts — exclusive enrollment
- history/ring-buffer.test.ts
- engine/create.test.ts
- engine/engine.test.ts — full lifecycle
- engine/kill-switch.test.ts
- engine/time-gate.test.ts
- engine/subscribe.test.ts

Run all tests. Run size check on packages/core. It must be under
3 KB gzipped (check with size-limit). If it's over, investigate which
module is too big and ask before adding more code.
```

**After session**: commit `feat(core): assignment strategies + engine`, push. Tag as `v0.1.0-alpha.1` (internal).

---

## Session 5 — React adapter (Opus)

**Goal**: React hooks + components with zero hydration mismatches.

**Gate**: `@variantlab/react` under 2 KB gzipped, tests pass under React 19 strict mode, example Vite+React app runs.

```
Read API.md (React Adapter section) and docs/design/api-philosophy.md
(hook-first design, render-prop for component swaps).

Implement @variantlab/react in packages/react/src/:

- context.tsx — VariantLabContext + VariantLabProvider component
    Provider accepts: engine (required), initialContext (optional)
    Wraps children in a stable context value
- hooks/use-variant.ts — useVariant(id): string
    Subscribes to engine, re-renders on change, uses useSyncExternalStore
    for React 18/19 concurrent mode correctness
- hooks/use-variant-value.ts — useVariantValue<T>(id): T
- hooks/use-experiment.ts — useExperiment(id): { variant, value, track }
- hooks/use-set-variant.ts — dev-only setter hook
- hooks/use-variant-lab-engine.ts — raw engine access
- hooks/use-route-experiments.ts — returns experiments active on
    current route (pure derivation from engine.getExperiments() +
    context.route)
- components/variant.tsx — <Variant experimentId={id}>{{ ... }}</Variant>
    Render-prop component. Children is a Record<VariantId, ReactNode>.
    Typescript enforces exhaustiveness when codegen is active.
    Accept `fallback` prop for unknown variants or errors.
- components/variant-value.tsx — <VariantValue> function-child pattern
- components/error-boundary.tsx — VariantErrorBoundary class component
    Catches errors in children, calls engine.reportCrash, re-renders
    with default variant on the next cycle. Supports custom `fallback`
    prop.
- index.ts — public API

Critical React correctness:
- Use useSyncExternalStore for all subscriptions (no useState/useEffect
  race conditions)
- Idempotent assignment: calling engine.getVariant twice in the same
  render must return the same value without side effects
- Strict mode double-invocation must not duplicate history entries
  (assignment is a pure read; exposure is recorded once per render
  tree via a ref guard)

Tests in packages/react/src/__tests__/ using vitest + @testing-library/react:
- provider.test.tsx
- use-variant.test.tsx — reads correct variant, updates on change
- use-variant-value.test.tsx
- use-experiment.test.tsx
- variant-component.test.tsx — renders correct child, falls back on
  unknown variant
- error-boundary.test.tsx — crash triggers reportCrash, renders default
- strict-mode.test.tsx — wrap everything in <React.StrictMode> and
  verify no duplicate subscriptions or assignments

Create a minimal example in examples/react-vite/:
- Vite + React + TypeScript
- experiments.json with 2-3 example experiments
- App.tsx using useVariant + <Variant> + useVariantValue
- README.md with `pnpm --filter react-vite-example dev` instructions

Run tests. Run size check on packages/react. Confirm under 2 KB gzipped.
Run the Vite example and verify hooks work.
```

**After session**: commit `feat(react): hooks + components + Vite example`, push.

---

## Session 6 — React Native adapter (Opus)

**Goal**: Native platform detection, storage, deep links, and the signature debug overlay.

**Gate**: `@variantlab/react-native` under 4 KB gzipped (without QR encoder), Expo example app runs on iOS + Android simulators, debug overlay bottom sheet opens and switches variants live.

```
Read API.md (React Native Adapter section), docs/features/debug-overlay.md,
docs/features/qr-sharing.md, and docs/research/origin-story.md (the
Drishtikon picker UX we want to generalize).

Implement @variantlab/react-native in packages/react-native/src/:

- Re-export everything from @variantlab/react
- context/auto-context.ts — getAutoContext() returning:
    platform from Platform.OS (ios/android)
    screenSize bucket from Dimensions.get('window')
    locale from NativeModules.SettingsManager (iOS) / I18nManager (Android),
      fall back to expo-localization if installed (peer dep, optional)
    appVersion from Constants.expoConfig?.version (optional Expo peer dep)
- storage/async-storage.ts — Storage adapter for @react-native-async-storage/async-storage
- storage/mmkv.ts — Storage adapter for react-native-mmkv (optional peer)
- storage/secure-store.ts — Storage adapter for expo-secure-store (optional peer)
- storage/memory.ts — in-memory storage for tests
- deep-link/handler.ts — registerDeepLinkHandler({ scheme }) using
    Linking.addEventListener('url') + Linking.getInitialURL()
    Validates payload per docs/features/qr-sharing.md security rules.
- deep-link/encode.ts — encodeSharePayload, decodeSharePayload
    Base64url + gzip-like compression via CompressionStream polyfill.
    Fallback to plain base64url if compression unavailable.
- overlay/floating-button.tsx — Animated.View floating button with
    badge showing active experiment count
- overlay/bottom-sheet.tsx — Modal + Animated sheet with slide-up
    animation. Hand-rolled, no third-party bottom-sheet lib.
- overlay/experiment-card.tsx — expandable card with variant picker
- overlay/search-input.tsx — filter input
- overlay/tabs/overview.tsx — active + targeted + not-targeted groups
- overlay/tabs/context.tsx — JSON tree view of VariantContext
- overlay/tabs/config.tsx — loaded config summary
- overlay/tabs/history.tsx — scrollable history list
- overlay/index.tsx — <VariantDebugOverlay /> component
    - Auto-disables unless __DEV__ or forceEnable prop
    - Logs warning if mounted in production
- qr/generate.ts — DEFERRED, export a stub that throws
    "QR generation not yet implemented — install @variantlab/qr in phase 4"
- index.ts — public exports

Requirements:
- No third-party animation libraries (use Animated API directly)
- No third-party icon libraries (inline SVG via react-native-svg — make
  this an optional peer dep, stub with Text "•" if not installed)
- No bottom-sheet library
- Respect safe area (useSafeAreaInsets from react-native-safe-area-context
  as optional peer, fallback to hardcoded insets)
- Debug overlay must be tree-shakeable: export it from
  @variantlab/react-native/debug (separate entrypoint)

Tests using @testing-library/react-native:
- Unit tests for storage adapters
- Unit tests for deep link encode/decode
- Unit tests for payload validation (malicious __proto__ injections)
- Snapshot test for debug overlay in various states

Example app in examples/expo-app/:
- Expo managed workflow (SDK 54+)
- experiments.json with the Drishtikon-style card-layout experiment
  (3-5 variants, not 30)
- Root wraps with VariantLabProvider
- Home screen uses <Variant> to render different card layouts
- Mounts <VariantDebugOverlay /> in dev
- README with `pnpm --filter expo-example start` instructions

Run tests. Run size check (without the overlay entrypoint). Confirm
the core adapter under 4 KB gzipped. Run the Expo example in the iOS
simulator if available and verify the debug overlay opens and switches
variants.
```

**After session**: commit `feat(react-native): adapter + debug overlay + Expo example`, push.

---

## Session 7 — Next.js adapter (Opus)

**Goal**: SSR-correct Next.js integration for App Router + Pages Router + Vercel Edge.

**Gate**: Zero hydration mismatches in the example app, works on Edge runtime, cookie-based stickiness survives refresh.

```
Read API.md (Next.js Adapter section), docs/research/framework-ssr-quirks.md
(Next.js section), and docs/design/design-principles.md principle 6
(SSR correct everywhere).

Implement @variantlab/next in packages/next/src/:

- server/create-variant-lab-server.ts — createVariantLabServer(config, options)
    Returns a server engine with getVariantSSR + variant cookie helpers
- server/get-variant-ssr.ts — async getVariantSSR(id, context) for
    use in Server Components and route handlers
- server/cookie.ts — parseCookie, serializeCookie for sticky assignment
    Cookie name: __variantlab_sticky (configurable)
    Cookie value: base64url(JSON({ userId, assignments }))
    httpOnly, sameSite: "lax", secure in production
- server/middleware.ts — variantLabMiddleware factory for Next.js
    Middleware API. Sets the sticky cookie on first request, reads
    on subsequent requests. Works on Vercel Edge runtime.
- client/provider.tsx — VariantLabProvider re-export with
    initialVariants hydration support (server injects initial
    assignments into props, client engine uses them as seeds)
- client/hooks.ts — re-export from @variantlab/react with Next.js
    router integration: useRouteExperiments() reads usePathname()
    from next/navigation
- index.ts — public exports
- app-router.ts — entrypoint for App Router specific helpers
- pages-router.ts — entrypoint for Pages Router specific helpers

Requirements:
- NO use of Node-only APIs in server code — must run on Vercel Edge,
  Cloudflare Workers, and Deno Deploy
- Web Crypto only (globalThis.crypto.subtle)
- Cookie parsing via hand-rolled parser (do not depend on "cookie"
  package)
- Hydration: the server renders with assignment X, sends X in the
  Provider's initialVariants, the client engine accepts X as the
  starting state. No re-evaluation on first render.
- Idempotent middleware: repeated requests produce the same cookie
- Strict CSP compatible (no inline scripts, no eval)

Tests using vitest + a mock Next.js request/response:
- cookie.test.ts — round-trip, malicious cookies rejected
- middleware.test.ts — sets cookie, reads cookie, deterministic
- get-variant-ssr.test.ts — same context produces same variant
- hydration.test.ts — server result === client first render

Example app in examples/next-app/:
- Next.js 15+ with App Router
- experiments.json with 2 value experiments + 1 render experiment
- app/layout.tsx wraps children in VariantLabProvider with
  initialVariants from middleware
- middleware.ts uses variantLabMiddleware
- app/page.tsx demonstrates useVariant + useVariantValue + <Variant>
- app/api/hello/route.ts demonstrates getVariantSSR in a route handler
- Deploy config for Vercel Edge
- README with dev + build instructions

Run tests. Run the example dev server. Open the browser. Refresh 10
times. Verify:
- Same variants every refresh (sticky cookie working)
- Zero hydration warnings in the console
- View source shows the server-rendered variant matches the client

Run `pnpm --filter next-example build` to verify production build
works under strict mode. Confirm size under 2 KB gzipped for the
@variantlab/next package itself.
```

**After session**: commit `feat(next): SSR adapter + App Router example`, push.

---

## Session 8 — CLI (Sonnet is fine here)

**Goal**: `init`, `generate`, `validate`, `eval` commands.

**Gate**: `npx @variantlab/cli init` scaffolds a working project, `generate` round-trips through the config, `validate` catches every rule from session 2.

**Model note**: Switch to Sonnet for this session with `/model sonnet`. CLI work is routine and Sonnet handles it well; save Opus quota for tricky adapters.

```
Read docs/features/codegen.md, docs/design/config-format.md, and
API.md (CLI section).

Implement @variantlab/cli in packages/cli/src/:

- bin/variantlab.ts — shebang entry, uses a tiny hand-rolled arg
    parser (NO commander, yargs, or meow — zero deps)
- commands/init.ts — variantlab init [--force]
    Creates experiments.json with a starter example, adds a postinstall
    script to package.json if missing, prints next steps
- commands/generate.ts — variantlab generate [--config PATH] [--out PATH] [--watch]
    Reads experiments.json via @variantlab/core's validateConfig
    Emits TypeScript per docs/features/codegen.md "Output file shape"
    In --watch mode, uses fs.watch with 100ms debounce, validates
    before writing, rejects invalid configs with clear errors
- commands/validate.ts — variantlab validate [PATH]
    Runs validateConfig, prints issues in a readable format, exits
    non-zero on failure
- commands/eval.ts — variantlab eval <config> --experiment <id>
    [--context '<json>'] [--context-file PATH]
    Prints targeting + assignment trace using engine.explain
- utils/arg-parser.ts — minimal parser supporting --flag, --flag=value,
    --flag value, positional args
- utils/printer.ts — colored output using ANSI codes directly
    (no chalk/kleur)
- utils/file.ts — read/write helpers
- index.ts — programmatic exports (for tests and future plugin use)

Requirements:
- Node 18+ only
- Zero runtime dependencies
- ESM only (but shebang still works)
- Exit codes:
    0 = success
    1 = file not found
    2 = validation failed
    3 = I/O error
    4 = invalid arguments
- All commands accept --help and print usage
- All commands accept --verbose for extra logging

Tests in packages/cli/src/__tests__/:
- init.test.ts — runs in a tmp dir, verifies file creation
- generate.test.ts — input config → expected TS output (snapshot)
- validate.test.ts — valid + invalid inputs, exit codes
- eval.test.ts — explains targeting correctly
- arg-parser.test.ts — flag combinations

Add package.json bin field: { "variantlab": "./dist/bin/variantlab.js" }
Add shebang "#!/usr/bin/env node" to the built bin output (tsup banner).

Run tests. Link the CLI locally with `pnpm --filter @variantlab/cli
link --global` and verify:
- variantlab init in a tmp dir
- variantlab generate on the created config
- variantlab validate on a broken config
- variantlab eval on an experiment
```

**After session**: commit `feat(cli): init + generate + validate + eval`, push. Switch back to Opus with `/model opus` for the next session.

---

## Session 9 — Drishtikon migration (Opus)

**Goal**: Replace the Drishtikon `CardResizeMode*` ad-hoc system with variantlab. This is the reality check for phase 1.

**Gate**: Net LOC deleted > 1500, all 30 card modes still work, no visual regressions, added bundle size on Drishtikon under 7 KB gzipped.

**Note**: This session runs in the **Drishtikon repo**, not the variantlab repo. `cd` into the Drishtikon Mobile project first, then run `claude`.

```
We're migrating Drishtikon Mobile from its ad-hoc card-resize-mode system
to @variantlab/react-native. Read the following in the current repo:

- src/context/CardResizeModeContext.tsx
- src/components/ui/CardResizeModePicker.tsx
- src/components/feature/news-card/DetailedCardBody.tsx (the dispatcher)
- app/_layout.tsx (where the provider and picker are mounted)

Then read in the sibling variantlab repo at
/Users/minhajulislamtapadar/WorkSpace/variantlab/:

- docs/research/origin-story.md
- docs/features/debug-overlay.md
- API.md (React Native adapter section)

Plan:

1. Install @variantlab/core and @variantlab/react-native from the
   local monorepo using pnpm link or file: path (whichever works
   cleanly with Expo)
2. Create experiments.json at the Drishtikon repo root with ONE
   experiment:
   {
     "id": "news-card-detailed-layout",
     "name": "News card detailed layout",
     "type": "render",
     "default": "responsive-image",
     "routes": ["/", "/feed"],
     "variants": [<all 30 modes with id + label + description>]
   }
   Copy the mode IDs, labels, and descriptions from
   CardResizeModeContext.tsx. Use kebab-case IDs.
3. Run variantlab generate to emit src/variantlab.generated.ts
4. Create src/lib/variantlab.ts that instantiates the engine once
5. Wrap app/_layout.tsx children with VariantLabProvider (replacing
   CardResizeModeProvider)
6. Mount <VariantDebugOverlay /> inside the __DEV__ guard (replacing
   CardResizeModePicker)
7. Refactor DetailedCardBody.tsx:
   - Remove the switch-statement dispatcher
   - Wrap the card in <Variant experimentId="news-card-detailed-layout">
     with a children object mapping every mode ID to its component
   - Keep the existing mode component files untouched — just change
     the dispatch
8. Delete src/context/CardResizeModeContext.tsx
9. Delete src/components/ui/CardResizeModePicker.tsx
10. Remove CardResizeModeProvider from app/_layout.tsx
11. Remove all imports of useCardResizeMode across the codebase
    (use grep to find them)

Requirements:
- Zero behavior regressions: every one of the 30 modes must render
  the same as before
- The debug overlay must feel at least as good as the old picker
  (route-scoped, persistent, searchable)
- The old picker's floating-button position and color should be
  matched by the overlay (customize via VariantDebugOverlay props)
- Dev overlay hides on /n/ article pages and /election/constituency/
  (same rules as the existing BottomTabBar — see _layout.tsx's
  showChrome logic and apply the same to the overlay)
- Measure LOC delta: run `git diff --shortstat HEAD` at the end
- Run the app in Expo. Open the overlay. Switch through at least 10
  modes. Verify each renders correctly.

If anything in @variantlab/react-native doesn't work as expected
during the migration, note it in a MIGRATION_NOTES.md file at the
Drishtikon repo root. We'll use these notes to fix the variantlab
API before v0.1 ships.
```

**After session**: in the Drishtikon repo, commit `refactor: migrate to variantlab`. In the variantlab repo, open an issue for any `MIGRATION_NOTES.md` items that need API changes.

---

## Session 10 — v0.1.0 release (Opus for polish, Sonnet for docs)

**Goal**: Final polish, changesets, publish canary to npm.

**Gate**: `pnpm changeset` + `pnpm publish` works, the README quickstart copy-pastes into a fresh project and runs.

```
Read docs/phases/phase-1-mvp.md exit criteria. Then do a phase-1
release pass on the variantlab repo:

1. Run `pnpm -r test` and confirm all tests pass
2. Run `pnpm -r build` and confirm all packages build
3. Run `pnpm -r size` and confirm all size budgets met
4. Run `pnpm typecheck` across the workspace
5. Run `pnpm lint` and fix any issues
6. Run publint and arethetypeswrong on each package; fix any issues
7. For each package, create a changeset marking it as 0.1.0:
   `pnpm changeset` → select all packages → minor version →
   description: "Initial alpha release — see ROADMAP.md phase 1 for scope"
8. Run `pnpm changeset version` to bump all package.json files
9. Update CHANGELOG.md entries generated by changesets to cross-link
   the phase-1 doc
10. Update README.md:
    - Update the "Install" section with real npm commands
    - Update the "Quick start" to match what the example apps actually
      do now (not aspirational)
    - Add a "Current status" section noting this is 0.1.0 alpha
    - Link the example apps
11. Copy the quick-start code from README.md into a tmp directory.
    Install the published packages (or tarballs from pnpm pack).
    Run the example. Verify it actually works.
12. If step 11 reveals bugs in README or packages, fix them before
    publishing
13. Dry-run publish: `pnpm -r publish --dry-run`
14. Tag v0.1.0-alpha.0 (canary) for the real publish:
    `pnpm -r publish --tag alpha --access public`
15. Git tag: `git tag v0.1.0-alpha.0 && git push --tags`

Do NOT publish to the "latest" tag yet — we ship under the "alpha" tag
until someone outside the core team has used it successfully.

After publishing, update the variantlab repo README badge section
to show the npm version and install command.
```

**After session**: celebrate. v0.1.0-alpha.0 exists. Phase 1 is done.

---

## General workflow notes

### Model switching during a session

```
/model opus     # default for this file's prompts
/model sonnet   # for mechanical work (test writing, CLI, refactors)
/model haiku    # for subagent exploration
```

### Subagents to save main-session context

For any prompt that says "Read X, then Y, then Z", consider running the reads in parallel via the Explore subagent:

```
Use the Explore subagent to read docs/design/targeting-dsl.md,
docs/features/targeting.md, and docs/research/bundle-size-analysis.md,
and return a concise summary of the operators and size budget.
```

This keeps your main context lean and leaves more headroom for code.

### When to `/compact`

If a session's context gets above ~70%, run `/compact` before starting a new milestone's work inside the same session. Better: `/exit` and start fresh. Fresh sessions are almost always worth it for phase 1's discrete milestones.

### Commit hygiene

Each milestone ≈ one commit (or a small stack). If a milestone balloons into 10+ commits, the prompt was too big — split it next time.

### Between milestones

Read the diff yourself before committing. Claude writes good code on Opus, but you're the maintainer — you need to understand what shipped. This is also your chance to catch anything that drifts from the design docs.

### If a prompt fails

If a prompt produces something broken and Claude can't self-correct in 2-3 attempts:

1. `/exit`
2. Read what got written
3. Decide whether to keep it as a starting point or revert
4. Start fresh with a more specific prompt targeting the failing area

Don't let Claude spiral on the same bug for 30 turns — that burns quota and usually doesn't converge.

---

## See also

- [`phase-1-mvp.md`](./phase-1-mvp.md) — the exit criteria each session must hit
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — package layout and tooling
- [`API.md`](../../API.md) — the canonical API each session must implement
- [`docs/design/design-principles.md`](../design/design-principles.md) — the principles each session must respect
