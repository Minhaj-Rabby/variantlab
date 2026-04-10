# Design principles

The 8 principles that govern every design decision in variantlab. When we disagree about a change, we refer back to this document.

## Table of contents

1. [Framework-agnostic core, thin adapters](#1-framework-agnostic-core-thin-adapters)
2. [Zero runtime dependencies](#2-zero-runtime-dependencies)
3. [ESM-first, tree-shakeable, edge-compatible](#3-esm-first-tree-shakeable-edge-compatible)
4. [Security by construction](#4-security-by-construction)
5. [Declarative JSON as the contract](#5-declarative-json-as-the-contract)
6. [SSR correct everywhere](#6-ssr-correct-everywhere)
7. [Privacy by default](#7-privacy-by-default)
8. [Docs-first development](#8-docs-first-development)

---

## 1. Framework-agnostic core, thin adapters

**Principle**: The engine runs in any ECMAScript environment. Every framework binding is a thin wrapper.

**Why**: Frameworks change. React's concurrent mode, Vue's composition API, Svelte's runes, Solid's signals — each framework has its own way of expressing reactivity. If we tie the engine to one of them, we're locked in.

**Consequence**:
- `@variantlab/core` never imports `react`, `vue`, `svelte`, `solid`, or any framework
- The engine exposes a synchronous `subscribe(listener)` API and framework adapters bridge to their native reactivity
- Each adapter is < 200 LOC
- Adding a new framework costs us days, not months

**Test**: Can we write the core in pure TypeScript with only the TypeScript standard library? Yes. Is there any framework-specific code in `@variantlab/core`? No.

---

## 2. Zero runtime dependencies

**Principle**: `@variantlab/core` has zero runtime dependencies. Adapter packages have exactly one: `@variantlab/core`.

**Why**: Every runtime dependency is a supply-chain attack vector, a potential version conflict, a source of bundle bloat, and a transitive trust decision. The `event-stream` incident (2018), the `ua-parser-js` hijack (2021), the `xz-utils` backdoor (2024) — every major supply chain attack starts with an innocuous dependency.

**Consequence**:
- We write our own schema validator (400 bytes vs zod's 12 KB)
- We write our own semver matcher (250 bytes vs `semver`'s 6 KB)
- We write our own route glob matcher (150 bytes vs `minimatch`'s 4 KB)
- We write our own hash function (80 bytes vs `murmurhash`'s 500 bytes)
- We use Web Crypto API for HMAC, not a polyfill
- We reject every PR that adds a runtime dep without 2 maintainer approvals + discussion

**Test**: Does `npm ls --prod` in `@variantlab/core` show zero entries? Yes. Enforced by CI.

**Tradeoff**: We spend engineering time writing hand-rolled replacements for well-tested libraries. This is intentional. The cost is upfront; the benefit is compounding.

---

## 3. ESM-first, tree-shakeable, edge-compatible

**Principle**: All packages ship ES modules with aggressive tree-shaking. Every package runs in every modern runtime — Node 18+, Deno, Bun, browsers, React Native Hermes, Cloudflare Workers, Vercel Edge, AWS Lambda@Edge.

**Why**: CommonJS is dying. ESM is the future. Edge runtimes are the future. Any library that doesn't support all of these is a library that will need a rewrite in 3 years.

**Consequence**:
- `"type": "module"` in all package.json files
- Dual ESM+CJS output only for maximum compatibility (CJS wrapped via tsup)
- `"sideEffects": false` so bundlers tree-shake aggressively
- Separate entry points per feature (`@variantlab/core`, `@variantlab/core/debug`, `@variantlab/core/crypto`)
- No Node built-ins in core (no `fs`, no `path`, no `process`)
- No browser built-ins in core (no `window`, no `document`, no `localStorage`)
- Only Web APIs: `crypto.subtle`, `Date`, `Math`, `Map`, `Set`

**Test**: Does `@variantlab/core` import from `node:*`? No. Does it reference `window`? No. Does it run in a Cloudflare Worker sandbox? Yes.

---

## 4. Security by construction

**Principle**: Security is a property of the design, not a feature we add later.

**Why**: Security features retrofitted onto a library are always worse than security features designed in. A library that assumes it will only see trusted input will have a CVE the first time it sees untrusted input.

**Consequence**:
- No `eval`, no `Function()`, no dynamic `import()` on config data
- Prototype pollution blocked at the schema validator level via `Object.create(null)` and key allow-lists
- Constant-time HMAC verification via Web Crypto
- Hard limits on config size, nesting, and iteration counts
- Fail-open by default (return defaults on errors) with a fail-closed opt-in
- No global mutation (`window`, `globalThis`, module-level state)
- Config frozen after load via `Object.freeze`
- Zero-telemetry by default

**Test**: Does a crafted config with `{"__proto__": {"admin": true}}` compromise any object? No. Does a 10 MB config crash the engine? No, it's rejected at 1 MB. Does timing-attack HMAC verification reveal bytes? No, we use `crypto.subtle.verify`.

See [`SECURITY.md`](../../SECURITY.md) and [`docs/research/security-threats.md`](../research/security-threats.md).

---

## 5. Declarative JSON as the contract

**Principle**: `experiments.json` is the single source of truth. The engine's behavior is fully determined by the config plus the runtime context.

**Why**: JSON configs are:
- Version-controllable — diffs are readable in PRs
- Reviewable — a non-developer can read the config
- Tool-able — linters, codegen, IDE schema completion all work
- Portable — the same config works in every framework
- Safe — no code execution, no hidden behavior

**Consequence**:
- The config has a published JSON Schema (`experiments.schema.json`) for IDE validation
- The CLI provides `validate` to check configs in CI
- The CLI provides `generate` to codegen TypeScript types from configs
- Targeting predicates are data structures, not functions (except the escape hatch)
- Custom predicates (`targeting.predicate`) can only be supplied in application code, never in the JSON itself
- Configs are forward-compatible via a required `version` field; the engine refuses unknown versions

**Test**: Can a product manager edit `experiments.json` without reading any code? Yes. Can a QA engineer verify the config's validity without running the app? Yes (`variantlab validate`).

---

## 6. SSR correct everywhere

**Principle**: The engine is deterministic. Given the same config and context, it produces the same variant every time. This means no hydration mismatches, ever.

**Why**: A/B testing tools that cause hydration mismatches are broken. They force users to either render a placeholder (causing layout shift) or to defer all variant selection to the client (losing the point of SSR).

**Consequence**:
- No `Math.random()` in hot paths (even for `random` assignment — we use a seeded RNG keyed by userId)
- No `Date.now()` in hot paths (time-based targeting only at boundaries)
- Stable iteration order over config (sort by ID at load time)
- Cookie-based stickiness as the default hydration strategy
- Server helpers (`getVariantSSR`, `createVariantLabServer`) that run on any runtime
- Framework adapters handle the `<Provider initialVariants={...}>` hydration pattern

**Test**: Does rendering the same page 100 times produce identical HTML for a given user? Yes. Does the Next.js App Router test suite report zero hydration mismatches? Yes.

See [`docs/research/framework-ssr-quirks.md`](../research/framework-ssr-quirks.md).

---

## 7. Privacy by default

**Principle**: variantlab collects zero data about users, developers, or their apps. Every network call is explicit and opt-in.

**Why**: "Privacy opt-out" is a dark pattern. "Anonymous telemetry" is still data collection. GDPR and CCPA have real teeth. We believe a library should do exactly what the user asks and nothing more.

**Consequence**:
- No phone-home on import, initialization, or any event
- No analytics, no error tracking, no usage stats, no "anonymous ID"
- `Fetcher` is always user-provided — we ship a helper, not a default endpoint
- `Telemetry` is always user-provided — we ship an interface, not an implementation
- User IDs passed for sticky hashing are hashed client-side before any network call
- Debug overlay state is stored locally — QR sharing generates the QR on-device
- Every dependency is audited for phone-home behavior

**Test**: Run variantlab in a sandbox with no network access. Does it still work? Yes (except for user-provided remote configs). Does it try to open any connections? No.

**Promise to users**: If we ever add telemetry, it will be opt-in only, clearly documented, and the repo will be publicly forkable to a telemetry-free version under the same license.

---

## 8. Docs-first development

**Principle**: Every public API is specified in markdown before any code is written.

**Why**: Libraries that ship APIs first and documentation later almost always end up with inconsistencies, under-documented corners, and unclear intent. Libraries like TanStack Query, Zod, and tRPC all ship comprehensive docs *before* the corresponding code.

**Consequence**:
- `API.md` is authoritative — any PR that changes public APIs must update this file first
- `ARCHITECTURE.md` describes the runtime data flow before we implement it
- `SECURITY.md` describes the threat model before we design mitigations
- Every feature has a `docs/features/<name>.md` spec before implementation starts
- Every phase has a `docs/phases/phase-N-*.md` plan with exit criteria
- We run a design review on each doc with at least 2 reviewers before locking it

**Test**: Can a contributor read the docs and predict exactly what the code does? Yes. Does the test suite match the documented behavior? Yes.

---

## How these principles interact

The principles sometimes conflict. When they do:

- **Security always wins** over convenience
- **Privacy always wins** over features
- **Zero-dependency wins** over minor DX improvements
- **SSR correctness wins** over bundle size
- **Framework-agnostic core wins** over per-adapter ergonomics

We document every tradeoff in the relevant feature spec.

---

## Anti-principles (what we refuse to be)

1. **Not a SaaS.** We will never host a dashboard. We will ship reference self-host templates.
2. **Not a data collector.** We will never send data we don't absolutely need.
3. **Not a kitchen sink.** We will say no to features that don't earn their bundle-size cost.
4. **Not a plugin platform.** We keep the core small and let users compose.
5. **Not one-framework-only.** We refuse to optimize for any single framework at the expense of others.
6. **Not a dashboard.** Configs are files. Tools edit files. Git diffs them. We stay out of the editing UI business.
7. **Not closed-source.** Everything is MIT, everything is public, forever.

---

## Review cadence

These principles are reviewed:

- **On every major release** (1.0, 2.0, etc.)
- **When we add a new framework adapter** (does the adapter respect principle 1?)
- **When we add a runtime dependency** (does this violate principle 2?)
- **When we add a feature that collects data** (does this violate principle 7?)

Changes to principles require a public discussion and 2 maintainer approvals.
