# Killer features

The 10 features that make variantlab different from every free and paid A/B testing tool we surveyed. Each links to its own detailed spec.

## Table of contents

1. [On-device debug overlay](#1-on-device-debug-overlay)
2. [Route-scoped experiments](#2-route-scoped-experiments)
3. [Type-safe codegen from JSON](#3-type-safe-codegen-from-json)
4. [Value AND render experiments](#4-value-and-render-experiments)
5. [Deep-link + QR state sharing](#5-deep-link--qr-state-sharing)
6. [Crash-triggered automatic rollback](#6-crash-triggered-automatic-rollback)
7. [Time-travel inspector](#7-time-travel-inspector)
8. [Offline-first by default](#8-offline-first-by-default)
9. [HMAC-signed remote configs](#9-hmac-signed-remote-configs)
10. [Multivariate + feature flags in one tool](#10-multivariate--feature-flags-in-one-tool)

---

## 1. On-device debug overlay

**What it is**: A floating button you embed in dev builds. Tap it to open a bottom sheet listing every experiment active on the current route, with a tappable picker to switch variants live.

**Why it matters**: Existing tools either make you edit a config file + restart (slow), or open a web dashboard in a browser (outside the app context). Neither lets a designer or PM stand next to the phone and *feel* the difference in real time.

**Where we got the idea**: Directly from the Drishtikon small-phone card problem. See [`origin-story.md`](../research/origin-story.md).

**Who has it**:

- variantlab: **Yes**, first-class, on device
- Firebase Remote Config: **No**
- GrowthBook: **No** (web dashboard only)
- Statsig: **No** (web dashboard only)
- LaunchDarkly: **No** (web dashboard only)
- Amplitude: **No**
- react-native-ab: **No**

Spec: [`debug-overlay.md`](./debug-overlay.md)

---

## 2. Route-scoped experiments

**What it is**: Every experiment can declare a `routes` field (glob patterns). The debug overlay automatically filters to show only experiments relevant to the current screen.

**Why it matters**: Real apps have dozens of experiments. Showing all of them on every screen drowns the signal. Route scoping turns the debug overlay from a giant list into a focused "what's on this page" view.

**Extra benefit**: Experiments evaluate faster because non-matching ones are skipped entirely.

**Who has it**:

- variantlab: **Yes**
- GrowthBook: Partial (URL targeting in dashboard, no per-route client filtering)
- Everyone else: **No**

Spec: [`targeting.md`](./targeting.md#routes)

---

## 3. Type-safe codegen from JSON

**What it is**: The `variantlab generate` CLI reads `experiments.json` and emits a TypeScript `.d.ts` with literal-union types for every experiment ID and variant ID. The hooks are overloaded on these types.

```ts
const variant = useVariant("news-card-layout");
// variant is typed as:
// "responsive" | "scale-to-fit" | "pip-thumbnail"

const broken = useVariant("news-card-lay0ut");
// ❌ Type error: argument of type '"news-card-lay0ut"' is not assignable
```

**Why it matters**: Stringly-typed experiments are a source of production bugs. One typo and you're silently stuck on the default variant. Codegen turns every typo into a compile error.

**Who has it**:

- variantlab: **Yes** (first-class, via CLI)
- Statsig: Partial (via Statsig Console, requires network)
- LaunchDarkly: Partial (enterprise feature only)
- Everyone else: **No**

Spec: [`codegen.md`](./codegen.md)

---

## 4. Value AND render experiments

**What it is**: A single config format supports two experiment types:

- `type: "render"` — component swaps via `<Variant experimentId="...">`
- `type: "value"` — returned values via `useVariantValue<T>(id)`

Same JSON, same targeting, same debug overlay.

```json
{ "id": "cta-copy", "type": "value", "variants": [
    { "id": "buy", "value": "Buy now" },
    { "id": "get", "value": "Get started" }
]}
```

```ts
const copy = useVariantValue("cta-copy"); // "Buy now" | "Get started"
```

**Why it matters**: Other libraries force you to pick: either feature flags (values) or component-swap tools (render). variantlab is both. You learn one API, use it everywhere.

**Who has it**:

- variantlab: **Yes**, unified
- Firebase Remote Config: Values only
- LaunchDarkly: Values + custom JSON (no component-swap helper)
- react-native-ab: Render only
- Others: Usually one or the other

Spec: [`value-experiments.md`](./value-experiments.md)

---

## 5. Deep-link + QR state sharing

**What it is**: Any variant override can be encoded as a URL or QR code. A QA engineer can say "try this" by sharing a link. Scanning sets the exact same variants on another device.

```
drishtikon://variantlab?override=bmV3cy1jYXJkLWxheW91dDoyNQ
```

The payload is:

- Base64url-encoded
- Length-limited
- Signed with HMAC (if enabled)
- Rejected if the experiment has `overridable: false`

**Why it matters**: Remote debugging becomes trivial. No screen recordings, no "press button X then Y". Just send a link or a QR.

**Who has it**:

- variantlab: **Yes**
- Everyone else: **No** (you can build it yourself in every tool; no one ships it)

Spec: [`qr-sharing.md`](./qr-sharing.md)

---

## 6. Crash-triggered automatic rollback

**What it is**: Wrap a variant in `<VariantErrorBoundary>`. If that variant crashes `threshold` times within `window` ms, the engine clears the assignment and forces the default. A warning is emitted and (optionally) persisted so subsequent sessions stay on default.

```json
"rollback": { "threshold": 3, "window": 60000, "persistent": true }
```

**Why it matters**: A bad variant can crash 100% of the users targeted by it. Without rollback, your only fix is to ship a new config or new app version. With rollback, the user self-heals on the second crash.

**Where we got the idea**: From building a card layout that crashed on certain article data. We needed a safety net.

**Who has it**:

- variantlab: **Yes**, built in
- Sentry: Can detect crashes but can't rollback experiments
- LaunchDarkly: Manual kill-switch only
- Everyone else: **No**

Spec: [`crash-rollback.md`](./crash-rollback.md)

---

## 7. Time-travel inspector

**What it is**: The engine records every assignment, override, config load, and rollback event with a timestamp. The debug overlay exposes a "history" tab that lets you scrub backwards to see what was active at any point.

**Why it matters**:

- "Why did user X see variant Y?" becomes easy to answer
- QA can reproduce issues without guessing
- Rollback events become visible

**Who has it**:

- variantlab: **Yes** (dev-only)
- Redux DevTools: time-travel for state, not experiments
- Everyone else: **No**

Spec: [`time-travel.md`](./time-travel.md)

---

## 8. Offline-first by default

**What it is**: The engine loads its config from local storage on boot. Network fetches are background refreshes. If the network fails, nothing breaks. If the device is offline for a week, experiments still resolve.

**Why it matters**: Mobile apps spend 30%+ of their runtime offline or on flaky networks. A tool that requires the network to resolve experiments is a tool that degrades user experience.

**How we do it**:

- The initial config ships bundled with the app
- Remote configs are cached after the first fetch
- The engine resolves from cache synchronously
- Background refreshes update the cache without blocking

**Who has it**:

- variantlab: **Yes**, by design
- Firebase Remote Config: Yes, but blocks app startup in many configurations
- GrowthBook: Partial
- LaunchDarkly: Yes (caching SDK)
- Unleash: Partial

Nothing unique here, but it's table stakes and we refuse to ship without it.

---

## 9. HMAC-signed remote configs

**What it is**: Remote configs are optionally signed with HMAC-SHA256 using a shared secret. The engine verifies the signature before applying the config. Tampered or unauthorized configs are rejected.

```json
{
  "signature": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  "version": 1,
  "experiments": [...]
}
```

**Why it matters**: Without signing, anyone who MITM's your CDN can push a malicious config that changes which variant your users see — including weaponized variants that collect data.

**How we do it**:

- Web Crypto API (universal across runtimes)
- Constant-time verification
- Secret is embedded at build time, not transmitted
- Signing is a CLI command: `variantlab sign experiments.json --key $SECRET`

**Who has it**:

- variantlab: **Yes** (optional)
- LaunchDarkly: Yes (enterprise)
- Statsig: Partial (TLS only)
- Everyone else: **No**

Spec: [`hmac-signing.md`](./hmac-signing.md)

---

## 10. Multivariate + feature flags in one tool

**What it is**: variantlab isn't just A/B testing. The same engine handles:

- **2-variant A/B**: `[control, treatment]`
- **Multivariate**: `[A, B, C, D, E]` with arbitrary splits
- **Feature flags**: `[off, on]` with targeting and rollback
- **Kill switches**: global `enabled: false` or per-experiment
- **Time-boxed experiments**: `startDate` / `endDate`
- **Weighted rollouts**: 10% → 50% → 100% via split updates

**Why it matters**: Most teams use 2-3 different tools: one for A/B, one for feature flags, one for rollouts. variantlab does all of them with one config file, one API, one mental model.

**Who has it**:

- variantlab: **Yes**
- LaunchDarkly: Yes (but $$$)
- Statsig: Yes
- GrowthBook: Yes
- Firebase Remote Config: Partial (weak A/B support)
- Unleash: Flags only
- ConfigCat: Flags only

variantlab is unique in being **free + open-source + lightweight + all-in-one**.

Spec: [`multivariate.md`](./multivariate.md)

---

## What's NOT in the killer-feature list (and why)

We deliberately don't market these as killer features, even though we support them:

- **Sticky hashing** — every tool has it
- **User targeting** — every tool has it
- **Percentage rollouts** — every tool has it
- **Session persistence** — table stakes
- **Telemetry hooks** — we expose the interface but don't ship telemetry

Our differentiators are the 10 above. Everything else is baseline.

---

## The "one product" positioning

Looking at all 10 features together, variantlab's positioning is:

> "The developer experience of Storybook + the power of LaunchDarkly + the footprint of a tweet, for every frontend framework."

- **Storybook-like DX**: on-device picker, route-scoped, time-travel
- **LaunchDarkly-like power**: targeting, rollback, signing, multivariate
- **Tweet-sized footprint**: < 3 KB gzipped core
- **Framework-agnostic**: 10+ adapters from the same core

No competitor hits all four quadrants. That's the gap we fill.

---

## See also

- [`origin-story.md`](../research/origin-story.md) — why we built it
- [`competitors.md`](../research/competitors.md) — how we compare
- [`ROADMAP.md`](../../ROADMAP.md) — when each feature ships
