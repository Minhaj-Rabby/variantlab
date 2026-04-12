# Targeting

How variantlab decides whether a user is eligible for an experiment. This doc is a user-facing guide; the formal semantics are in [`docs/design/targeting-dsl.md`](../design/targeting-dsl.md).

## Table of contents

- [Mental model](#mental-model)
- [The VariantContext](#the-variantcontext)
- [Targeting fields](#targeting-fields)
- [Targeting by platform](#targeting-by-platform)
- [Targeting by app version](#targeting-by-app-version)
- [Targeting by locale](#targeting-by-locale)
- [Targeting by screen size](#targeting-by-screen-size)
- [Targeting by route](#targeting-by-route)
- [Targeting by user ID](#targeting-by-user-id)
- [Targeting by custom attributes](#targeting-by-custom-attributes)
- [The predicate escape hatch](#the-predicate-escape-hatch)
- [Combining targeting rules](#combining-targeting-rules)
- [How to debug targeting](#how-to-debug-targeting)

---

## Mental model

Targeting answers one question: **"Is this user eligible for this experiment?"**

If the answer is no, the user sees the default variant. If yes, the assignment logic (random, sticky-hash, weighted) picks a variant.

The targeting predicate is a pure function of the `VariantContext`. Given the same context, the same experiment always targets the same way. This is what makes SSR work.

---

## The VariantContext

The context is the input to every targeting decision. It is populated by the framework adapter automatically, but can be overridden:

```ts
interface VariantContext {
  platform?: "ios" | "android" | "web" | "node";
  appVersion?: string;       // "2.3.1"
  locale?: string;           // "bn-BD"
  screenSize?: "small" | "medium" | "large";
  route?: string;            // "/feed"
  userId?: string;           // hashed internally
  attributes?: Record<string, string | number | boolean>;
}
```

### Auto-populated fields

Each adapter fills in what it can:

- **`@variantlab/react-native`**: platform, appVersion (from `expo-constants` or `react-native-device-info`), locale, screenSize, route
- **`@variantlab/next`**: platform (`web` or `node`), locale, route
- **`@variantlab/vue`**: platform (`web`), locale
- **`@variantlab/core`**: nothing — you provide everything

### Manually setting context

```tsx
<VariantLabProvider
  initialContext={{
    userId: "user-123",
    attributes: { plan: "premium", betaOptIn: true },
  }}
>
  <App />
</VariantLabProvider>
```

Merging: manual context is merged over auto-populated context. Manual wins on conflict.

### Updating context at runtime

```ts
const engine = useVariantLabEngine();
engine.updateContext({ userId: await getUserId() });
```

Every experiment is re-evaluated on context change. Assignments are cached per `(userId, experimentId)` so targeting runs once per user per experiment unless context changes.

---

## Targeting fields

All fields optional. If no targeting is specified, **every user matches**.

When multiple fields are specified, they are **ANDed together**. For OR semantics, use the `predicate` escape hatch or split into multiple experiments.

---

## Targeting by platform

```json
"targeting": { "platform": ["ios", "android"] }
```

Matches users whose `context.platform` is in the list.

**Use cases**:

- Mobile-only features
- Platform-specific rollouts (iOS-first launches)
- Excluding SSR (no `node` in the list)

---

## Targeting by app version

```json
"targeting": { "appVersion": ">=2.0.0" }
```

Matches users whose `context.appVersion` satisfies the semver range.

### Supported ranges

- `1.2.3` (exact)
- `>=1.2.3`
- `^1.2.0` (1.2.0 <= v < 2.0.0)
- `~1.2.0` (1.2.0 <= v < 1.3.0)
- `1.2.0 - 1.5.0`
- `>=1.0.0 <2.0.0 || >=3.0.0`

### Common patterns

```json
// Only users on the latest version
"appVersion": ">=2.5.0"

// Exclude a broken version
"appVersion": ">=2.0.0 <2.3.5 || >=2.3.7"

// New feature behind a minimum version
"appVersion": ">=3.0.0"
```

### Reading the version

Adapters auto-populate from:

- React Native: `Constants.expoConfig?.version` or `DeviceInfo.getVersion()`
- Next.js: user-supplied (no built-in way)
- Web: user-supplied via build-time env var (e.g., `process.env.NEXT_PUBLIC_APP_VERSION`)

---

## Targeting by locale

```json
"targeting": { "locale": ["en", "bn"] }
```

Matches if `context.locale` matches any entry. Two match modes:

- **Prefix** (recommended): `"en"` matches `"en"`, `"en-US"`, `"en-GB"`
- **Exact**: `"en-US"` matches only `"en-US"`

### Use cases

- Language-specific experiments
- Regional rollouts
- Translation A/B tests

### Example

```json
{
  "id": "casual-bengali-copy",
  "targeting": { "locale": ["bn"] },
  "variants": [
    { "id": "formal", "value": "অনুগ্রহ করে লগইন করুন" },
    { "id": "casual", "value": "লগইন করুন" }
  ]
}
```

---

## Targeting by screen size

```json
"targeting": { "screenSize": ["small"] }
```

Matches devices in the specified buckets:

- `"small"` — `max(width, height) < 700 px`
- `"medium"` — `700 ≤ max(width, height) < 1200 px`
- `"large"` — `max(width, height) ≥ 1200 px`

### Why buckets?

- Stable across zoom and orientation changes
- Readable in configs ("small" vs "< 700px")
- Easy to target exact device classes

### Customizing thresholds

```ts
createEngine(config, {
  screenSize: {
    smallMax: 640,
    mediumMax: 1024,
  },
});
```

### Use cases

- Card layout experiments (the Drishtikon origin story)
- Responsive UI tests
- Touch target size variations

---

## Targeting by route

```json
"targeting": { "routes": ["/feed", "/article/*"] }
```

Matches if `context.route` matches any glob pattern.

### Glob syntax

- `/about` — exact
- `/blog/*` — single segment wildcard
- `/docs/**` — multi-segment wildcard
- `/user/:id` — parameter (matches any single segment)

### Trailing slash insensitive

`/about` matches both `/about` and `/about/`.

### Use cases

- Feature flags scoped to specific screens
- Performance experiments only on heavy pages
- Debug overlay filtering

### How the route is read

Framework adapters auto-populate the route:

- **Expo Router**: via `usePathname` or `useRouter().pathname`
- **React Navigation**: via `useRoute()` + config parser
- **Next.js App Router**: via `usePathname` from `next/navigation`
- **Next.js Pages Router**: via `useRouter().pathname`
- **Remix**: via `useLocation().pathname`
- **Nuxt**: via `useRoute().path`
- **SvelteKit**: via `$page.url.pathname`

---

## Targeting by user ID

Two modes.

### Explicit list

```json
"targeting": { "userId": ["alice", "bob", "charlie"] }
```

Matches if `context.userId` is in the list exactly.

**Max 10,000 entries.** Larger lists slow down config loading.

**Use cases**: beta whitelists, internal testing, VIP features.

### Hash bucket

```json
"targeting": { "userId": { "hash": "sha256", "mod": 10 } }
```

Matches if `sha256(userId) % 100 < mod`. In this example, 10% of users match.

**Use cases**: percentage rollouts, deterministic subsetting.

**Why sha256?** Uniform distribution and available everywhere via Web Crypto API.

---

## Targeting by custom attributes

```json
"targeting": {
  "attributes": {
    "plan": "premium",
    "region": "us-west",
    "betaOptIn": true
  }
}
```

Every specified key must match exactly. Values can be strings, numbers, or booleans.

### Setting attributes

```ts
<VariantLabProvider
  initialContext={{
    attributes: {
      plan: user.subscription,
      region: user.region,
      betaOptIn: user.betaOptIn,
      signupDaysAgo: daysSince(user.createdAt),
    },
  }}
>
```

### No operators

Attribute matching is exact equality only. For greater-than, less-than, pattern matching, or OR logic, use the `predicate` escape hatch.

---

## The predicate escape hatch

For complex targeting that doesn't fit the declarative DSL, provide a function:

```ts
const engine = createEngine(config, {
  experimentOverrides: {
    "new-feature": {
      targeting: {
        platform: ["ios", "android"],
        predicate: (ctx) =>
          typeof ctx.attributes?.signupDaysAgo === "number" &&
          ctx.attributes.signupDaysAgo >= 7 &&
          ctx.attributes.signupDaysAgo <= 30,
      },
    },
  },
});
```

### Constraints

- **Code-only** — cannot be specified in JSON
- **Pure** — no side effects, no async
- **Fast** — runs on every evaluation; keep it O(1)
- **ANDed** — combined with the declarative fields

### When to use it

- Numeric comparisons
- Time-based rules
- Dependency on external state
- OR / NOT logic

### When NOT to use it

- When the declarative operators cover your case (use them — they're debuggable in PRs)
- For large logic blocks (refactor into the app, use a simpler flag)

---

## Combining targeting rules

All fields are implicit AND:

```json
"targeting": {
  "platform": ["ios"],
  "appVersion": ">=2.0.0",
  "locale": ["en"],
  "screenSize": ["small"],
  "routes": ["/feed"],
  "attributes": { "plan": "premium" }
}
```

This matches: iOS users on app v2.0.0+, English locale, small screens, on `/feed`, with a premium plan.

### Getting OR logic

Split into multiple experiments:

```json
// Two experiments with the same variants but different targeting
{
  "id": "new-checkout-premium",
  "targeting": { "attributes": { "plan": "premium" } },
  "variants": [...]
},
{
  "id": "new-checkout-pro",
  "targeting": { "attributes": { "plan": "pro" } },
  "variants": [...]
}
```

Or use the `predicate`:

```ts
targeting: {
  predicate: (ctx) =>
    ctx.attributes?.plan === "premium" ||
    ctx.attributes?.plan === "pro",
}
```

### Mutually exclusive experiments

Use the `mutex` field:

```json
{ "id": "card-layout-a", "mutex": "card-layout", ... },
{ "id": "card-layout-b", "mutex": "card-layout", ... }
```

A user who matches both is assigned to exactly one, deterministically hashed by experiment ID.

---

## How to debug targeting

### Debug overlay

The overlay shows three groups:

1. **Active** — user is enrolled
2. **Targeted but not enrolled** — targeting passed but assignment chose default (e.g., due to weights)
3. **Not targeted** — targeting failed, showing which field caused the failure

Each card has an "Explain" button showing the evaluation trace:

```
news-card-layout:
  platform: ios ✅ (matched)
  appVersion: >=2.0.0 ✅ (2.3.1 satisfies)
  screenSize: small ❌ (got "large")
  → FAIL: screenSize
```

### CLI

```bash
variantlab eval experiments.json \
  --context '{"platform":"ios","appVersion":"2.0.0"}' \
  --experiment news-card-layout
```

Outputs the full evaluation trace.

### Engine method

```ts
const engine = createEngine(config);
const explanation = engine.explain("news-card-layout", context);
console.log(explanation);
// { matched: false, reason: "screenSize", ... }
```

---

## Performance

Targeting evaluation is hot-path code. We budget ~2 µs per experiment on modern hardware.

Optimizations:

- Kill-switch check before any targeting (O(1))
- Platform check second (O(1) set lookup)
- Cheap checks before expensive ones
- Assignment cache by `(userId, experimentId)` to avoid re-evaluation
- Pre-compiled route globs at config load time

At 100 experiments and 10 hooks per render, targeting is well under 1 ms of frame budget. Not a concern.

---

## See also

- [`targeting-dsl.md`](../design/targeting-dsl.md) — formal semantics
- [`config-format.md`](../design/config-format.md) — field reference
- [`debug-overlay.md`](./debug-overlay.md) — live debugging
