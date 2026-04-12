# Targeting DSL

How targeting predicates work, why we chose the design we did, and the semantics of each operator.

## Table of contents

- [Design goals](#design-goals)
- [The predicate shape](#the-predicate-shape)
- [Evaluation semantics](#evaluation-semantics)
- [Operators](#operators)
- [The escape hatch](#the-escape-hatch)
- [Why not a full expression language](#why-not-a-full-expression-language)
- [Evaluation order](#evaluation-order)
- [Performance](#performance)

---

## Design goals

1. **Expressible enough** to cover 95% of real-world targeting needs without custom code
2. **Simple enough** to read in a PR without documentation
3. **Safe** — no code execution, no prototype pollution, no regex ReDoS
4. **Fast** — O(1) or O(n) evaluation per experiment, never exponential
5. **Declarative** — JSON-shaped data, diffable in Git
6. **SSR-deterministic** — pure function of context

---

## The predicate shape

```ts
interface Targeting {
  platform?: Array<"ios" | "android" | "web" | "node">;
  appVersion?: string;      // semver range
  locale?: string[];        // IETF language tags
  screenSize?: Array<"small" | "medium" | "large">;
  routes?: string[];        // glob patterns
  userId?: string[] | { hash: "sha256"; mod: number };
  attributes?: Record<string, string | number | boolean>;
  predicate?: (context: VariantContext) => boolean; // escape hatch, code-only
}
```

A `Targeting` object is an **implicit AND** of all specified fields. If no fields are specified, the predicate matches every user.

---

## Evaluation semantics

```
match(targeting, context) =
  platform_match(targeting.platform, context.platform)
    AND appVersion_match(targeting.appVersion, context.appVersion)
    AND locale_match(targeting.locale, context.locale)
    AND screenSize_match(targeting.screenSize, context.screenSize)
    AND routes_match(targeting.routes, context.route)
    AND userId_match(targeting.userId, context.userId)
    AND attributes_match(targeting.attributes, context.attributes)
    AND predicate(context)
```

Each sub-match is:

- **True if the field is not specified in targeting** (open by default)
- **True if the specified predicate matches**
- **False otherwise**

An unspecified field in the context does **not** match a specified targeting field. For example:

```json
"targeting": { "platform": ["ios"] }
```

If `context.platform` is `undefined`, this targeting fails to match.

### Why implicit AND?

Because it's the most common case. 90% of targeting reads as "platform X AND version Y AND route Z". When you need OR, compose multiple experiments or use the `predicate` escape hatch.

### Why no explicit OR operator?

We considered:

```json
"targeting": {
  "or": [
    { "platform": ["ios"] },
    { "platform": ["android"], "appVersion": ">=2.0.0" }
  ]
}
```

Rejected because:

1. Most users don't need OR
2. Adds ~300 bytes to the evaluator
3. Encourages complex configs that should be split into multiple experiments
4. The `predicate` escape hatch handles the rare cases

---

## Operators

### `platform`

```ts
platform?: Array<"ios" | "android" | "web" | "node">;
```

Set membership. Matches if `context.platform` is in the array.

**Values**:

- `"ios"` — iOS, iPadOS
- `"android"` — Android
- `"web"` — any browser environment (including desktop web, mobile web, PWA)
- `"node"` — server-side (SSR, edge runtimes)

**Implementation**: O(1) lookup.

### `appVersion`

```ts
appVersion?: string; // semver range
```

Semver range matching. Matches if `context.appVersion` satisfies the range.

**Supported syntax** (subset of npm semver):

- Comparators: `=`, `<`, `<=`, `>`, `>=`
- Caret: `^1.2.0` (>= 1.2.0 < 2.0.0)
- Tilde: `~1.2.0` (>= 1.2.0 < 1.3.0)
- Range: `1.2.0 - 2.0.0`
- Compound: `>=1.0.0 <2.0.0`
- OR ranges: `>=1.0.0 <2.0.0 || >=3.0.0`

**Not supported**:

- Prerelease comparisons (`1.2.0-beta.1`)
- Build metadata (`1.2.0+sha.abc`)
- `x` wildcards (`1.2.x`)

If you need these, use the `predicate` escape hatch.

**Implementation**: Hand-rolled parser, ~250 bytes. Linear time.

### `locale`

```ts
locale?: string[]; // IETF language tags
```

Matches if `context.locale` matches any entry. Two match modes:

- **Exact**: `"en-US"` matches `"en-US"` only
- **Prefix**: `"en"` matches `"en"`, `"en-US"`, `"en-GB"`, etc.

**Implementation**: String prefix comparison.

### `screenSize`

```ts
screenSize?: Array<"small" | "medium" | "large">;
```

Set membership on pre-bucketed screen sizes. Adapter packages derive the bucket from screen dimensions:

- `"small"`: `max(width, height) < 700 px`
- `"medium"`: `700 ≤ max(width, height) < 1200 px`
- `"large"`: `max(width, height) ≥ 1200 px`

Thresholds are configurable at engine creation.

**Why bucket instead of exact pixels?** Buckets keep configs stable across device zooms, responsive changes, and orientation changes. Also makes configs readable ("target small screens") instead of cryptic ("target < 700px").

### `routes`

```ts
routes?: string[]; // glob patterns
```

Matches if `context.route` matches any pattern. Supported glob syntax:

- Exact: `/about`
- Wildcard segment: `/blog/*`
- Wildcard deep: `/docs/**`
- Parameter: `/user/:id`
- Trailing slash insensitive

**Not supported**:

- Character classes: `/[abc]/`
- Braces: `/foo/{a,b}/`
- Negation: `/foo/!(bar)/`

If you need these, use the `predicate` escape hatch.

**Implementation**: Linear-time matcher, ~150 bytes. No regex backtracking risk.

### `userId`

```ts
userId?: string[] | { hash: "sha256"; mod: number };
```

Two modes:

#### Explicit list

```json
"userId": ["alice", "bob", "charlie"]
```

Matches if `context.userId` is in the list. Max 10,000 entries. Useful for:

- Whitelist betas
- Internal user testing
- Specific user debugging

#### Hash bucket

```json
"userId": { "hash": "sha256", "mod": 10 }
```

Matches if `sha256(userId) % 100 < mod`. In this example, 10% of users match.

**Why sha256?** Uniform distribution and available via Web Crypto API in every runtime. Slightly slower than a simple hash but security-relevant (we don't want attackers to easily guess which users will match).

**Performance**: sha256 takes ~1 µs in modern engines. Negligible at the frequency of variant evaluation.

### `attributes`

```ts
attributes?: Record<string, string | number | boolean>;
```

Exact-match predicate on `context.attributes`. Every specified key must match exactly.

```json
"attributes": {
  "plan": "premium",
  "region": "us-west",
  "betaOptIn": true
}
```

Matches if:

- `context.attributes.plan === "premium"` AND
- `context.attributes.region === "us-west"` AND
- `context.attributes.betaOptIn === true`

**Implementation**: Linear scan. Keys are validated against the reserved-words list (`__proto__`, `constructor`, `prototype`).

**Why no comparison operators?** Because you can't represent "plan != premium" cleanly in JSON without inventing a sub-DSL. The `predicate` escape hatch handles it in ~5 lines of JS.

---

## The escape hatch

```ts
targeting: {
  predicate: (context) => context.daysSinceInstall > 7 && context.isPremium
}
```

The `predicate` field is a function that takes the runtime context and returns a boolean. It is:

- **Only available in application code**, never in JSON configs
- **Not validated** — the user is responsible for writing safe code
- **ANDed with** the other targeting fields

This exists because 5% of real-world cases need custom logic:

- Time-based targeting (hours since install, days until expiry)
- Device characteristics beyond screen size (GPU tier, RAM)
- External data (experiments based on server state)
- Complex attribute comparisons (numeric thresholds, regex matching)

### Why not allow predicates in JSON?

Because JSON predicates mean either:

1. A full expression language (heavy, security risk)
2. A limited DSL (inevitably grows a new operator per month)
3. `eval` of string JS (unacceptable — violates design principle 4)

None of these are good. The function escape hatch is the cleanest.

### When to use `predicate`

- You need AND-OR-NOT combinations
- You need numeric comparisons
- You need to read from application state
- You need to check device capabilities

### When NOT to use `predicate`

- The built-in operators cover your case (use them, they're cheaper and reviewable in PRs)
- The logic belongs in the product, not the experiment (refactor)
- You're trying to implement RBAC (use a real auth system)

---

## Why not a full expression language

We considered shipping a full predicate language like:

```json
"targeting": {
  "expr": "platform == 'ios' && appVersion >= '2.0.0' && attributes.plan in ['premium', 'pro']"
}
```

Rejected for these reasons:

1. **Parser weight** — a safe expression parser is 2-5 KB gzipped
2. **Security surface** — parsers have bugs, bugs become CVEs
3. **Review burden** — expressions in JSON are harder to diff in PRs than structured data
4. **Diminishing returns** — 95% of cases are covered by the current operators
5. **The escape hatch** — users with exotic needs already have `predicate`

Existing tools that use expression languages (Unleash, LaunchDarkly) pay this price and get complex targeting. We pay nothing and get 95% of the value.

---

## Evaluation order

To short-circuit fast, the engine evaluates predicates in this order:

1. **`enabled` kill switch** (O(1))
2. **`startDate` / `endDate`** (O(1))
3. **`platform`** (O(n), n ≤ 4)
4. **`screenSize`** (O(n), n ≤ 3)
5. **`locale`** (O(n))
6. **`appVersion`** (O(n), n = range tokens)
7. **`routes`** (O(n × m), n = patterns, m = path segments)
8. **`attributes`** (O(n))
9. **`userId`** (O(n) for list; O(hash) for bucket)
10. **`predicate`** (O(?) — unknown, runs last)

Fast rejects first, expensive last.

---

## Performance

### Benchmarks (preliminary, to be refined)

On a modern laptop (M2 Pro, Node 20):

- Full targeting evaluation with all operators: ~2 µs
- Empty targeting: ~50 ns
- sha256 user hash bucket: ~1 µs
- Route glob matching: ~200 ns per pattern

At typical app load — 10 experiments, 5-10 hook calls per render — targeting evaluation is well below 100 µs total. Negligible.

### Caching

The engine caches variant assignments per `(userId, experimentId)` so targeting is re-evaluated only when context changes (e.g., route changes, user logs in).

### Hot-path optimization

- No allocations on the hot path after warmup
- No regex in the hot path
- Integer comparisons for semver, not string comparison
- Pre-compiled route patterns at config load time

---

## Examples

### Target iOS users on small screens running the latest version

```json
"targeting": {
  "platform": ["ios"],
  "screenSize": ["small"],
  "appVersion": ">=2.0.0"
}
```

### Target 10% of users deterministically

```json
"targeting": {
  "userId": { "hash": "sha256", "mod": 10 }
}
```

### Target premium users in Bengali locale

```json
"targeting": {
  "locale": ["bn"],
  "attributes": { "plan": "premium" }
}
```

### Time-based targeting (application code)

```ts
const targeting = {
  platform: ["ios", "android"],
  predicate: (ctx) => {
    const installDate = new Date(ctx.attributes.installDate as string);
    const daysSinceInstall = (Date.now() - installDate.getTime()) / 86400000;
    return daysSinceInstall >= 7 && daysSinceInstall <= 30;
  }
};
```

---

## Future extensions (not in v0.1)

- **Rollout curves** — 0% → 50% → 100% over time via `startDate`/`endDate` interpolation
- **Cohort targeting** — user cohorts defined by custom criteria stored alongside experiments
- **Multi-variate interactions** — targeting that depends on other experiment assignments
- **Geolocation targeting** — country/region from IP, via adapter-provided context

All of these are post-v1.0 considerations and require API stability first.

---

## See also

- [`docs/design/config-format.md`](./config-format.md) — the enclosing config format
- [`API.md`](../../API.md) — the `Targeting` TypeScript interface
- [`docs/research/bundle-size-analysis.md`](../research/bundle-size-analysis.md) — why we hand-rolled the matchers
