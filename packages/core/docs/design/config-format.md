# Config format (`experiments.json`)

The canonical specification for the `experiments.json` file. Also published as a JSON Schema at [`experiments.schema.json`](../../experiments.schema.json) for IDE validation.

## Table of contents

- [File structure](#file-structure)
- [Top-level fields](#top-level-fields)
- [Experiment fields](#experiment-fields)
- [Variant fields](#variant-fields)
- [Targeting fields](#targeting-fields)
- [Rollback fields](#rollback-fields)
- [Validation rules](#validation-rules)
- [Examples](#examples)
- [Forward compatibility](#forward-compatibility)

---

## File structure

```json
{
  "$schema": "https://variantlab.dev/schemas/experiments.schema.json",
  "version": 1,
  "signature": "base64url-hmac-optional",
  "enabled": true,
  "experiments": [
    {
      "id": "example",
      "name": "Example experiment",
      "variants": [
        { "id": "a" },
        { "id": "b" }
      ],
      "default": "a"
    }
  ]
}
```

---

## Top-level fields

| Field | Type | Required | Description |
|---|---|:-:|---|
| `$schema` | string | No | JSON Schema reference for IDE support. Ignored by the engine. |
| `version` | integer | Yes | Schema version. Must be `1`. The engine rejects unknown versions. |
| `signature` | string | No | Base64url-encoded HMAC-SHA256 of the canonical form of `experiments`. Verified via Web Crypto API when an `hmacKey` is configured. |
| `enabled` | boolean | No | Global kill switch. When `false`, all experiments return their default variant. Defaults to `true`. |
| `experiments` | array | Yes | Array of experiment definitions. Max 1000 entries. |

### Why `version`?

The schema will evolve. We want forward-compatible configs that can upgrade in memory (minor) and be rejected cleanly (major). Currently version 1.

### Why `signature`?

Optional HMAC enables tamper detection on remote configs. See [`docs/features/hmac-signing.md`](../features/hmac-signing.md).

### Why `enabled`?

Kill switch for fast incident response. If a bad config ships, users can flip this flag in a new config and push to disable everything instantly without a code release.

---

## Experiment fields

| Field | Type | Required | Default | Description |
|---|---|:-:|---|---|
| `id` | string | Yes | — | Unique identifier. `/^[a-z0-9][a-z0-9-]{0,63}$/` |
| `name` | string | Yes | — | Human-readable. Max 128 chars. |
| `description` | string | No | — | Shown in debug overlay. Max 512 chars. |
| `type` | enum | No | `"render"` | `"render"` for component swaps, `"value"` for returned values. |
| `variants` | array | Yes | — | At least 2, at most 100. |
| `default` | string | Yes | — | Must match one of `variants[].id`. |
| `routes` | array | No | — | Glob patterns. Max 100. |
| `targeting` | object | No | — | Targeting predicate. |
| `assignment` | enum | No | `"default"` | Strategy: `default | random | sticky-hash | weighted`. |
| `split` | object | No | — | Traffic split for `weighted` strategy. |
| `mutex` | string | No | — | Mutual exclusion group. |
| `rollback` | object | No | — | Crash-rollback configuration. |
| `status` | enum | No | `"active"` | `draft | active | archived`. |
| `startDate` | ISO 8601 | No | — | Inactive before this. |
| `endDate` | ISO 8601 | No | — | Inactive after this. |
| `owner` | string | No | — | Free text. Max 128 chars. |
| `overridable` | boolean | No | `false` | Whether deep link overrides are accepted. |

### `id`

Case-sensitive, lowercase. Allowed characters: `a-z`, `0-9`, `-`. Max 64 characters. Must not start with a hyphen. Examples:

- `cta-copy` ✅
- `news-card-layout` ✅
- `checkout-v2` ✅
- `CTA_copy` ❌ (uppercase + underscore)
- `-leading-dash` ❌

### `type`

- `"render"`: designed for `<Variant>` component-swap usage. Variants don't need a `value`.
- `"value"`: designed for `useVariantValue` usage. Each variant has a `value` field.

Mixing is fine; you can use a `render`-type experiment with `useVariant` to read the variant ID as a string.

### `default`

Required. Must reference a valid variant ID. Used when:

- Targeting fails
- Kill switch is on
- `startDate` is in the future or `endDate` is in the past
- Engine is in fail-open mode and an error occurs
- Deep link override is not allowed
- Crash rollback has triggered

### `routes`

Glob patterns matching current route/pathname. Used both for targeting and for debug overlay filtering.

Supported patterns:

- Exact: `/`, `/about`
- Wildcard segment: `/blog/*`
- Wildcard deep: `/docs/**`
- Parameter: `/user/:id`
- Trailing-slash insensitive

Routes are matched against `VariantContext.route` at evaluation time. Adapters auto-populate this from the router:

- `@variantlab/react-native` — from Expo Router `usePathname` or React Navigation
- `@variantlab/next` — from `useRouter().pathname` or `usePathname`
- `@variantlab/remix` — from `useLocation().pathname`
- etc.

### `assignment`

- `"default"` — always return the default variant. Useful for pre-launch experiments.
- `"random"` — uniform random across variants, assigned once per user and cached.
- `"sticky-hash"` — deterministic hash of `(userId, experimentId)` mapped to a variant. Stable across devices for the same `userId`.
- `"weighted"` — traffic split via `split` field. Uses sticky-hash for determinism.

### `split`

Required when `assignment: "weighted"`. Object mapping variant IDs to integer percentages summing to 100.

```json
"split": {
  "control": 50,
  "treatment-a": 25,
  "treatment-b": 25
}
```

### `mutex`

Mutual exclusion group. Experiments with the same `mutex` cannot co-run on the same user. When two mutex'd experiments both target a user, the engine picks one by stable hash and excludes the others.

Use case: two competing card-layout experiments shouldn't both fire on the same session.

### `rollback`

See [rollback fields](#rollback-fields) below and [`docs/features/crash-rollback.md`](../features/crash-rollback.md).

### `status`

- `"draft"` — visible in debug overlay (with a draft badge), returns default in production
- `"active"` — normal operation
- `"archived"` — hidden from debug overlay, returns default

### `startDate` / `endDate`

ISO 8601 timestamps. Inclusive start, exclusive end. Useful for time-boxed rollouts.

### `owner`

Free-text field for tracking who owns the experiment. Not used by the engine. Shown in debug overlay.

### `overridable`

Whether deep links can override this experiment. Default `false` for safety. See [`docs/features/qr-sharing.md`](../features/qr-sharing.md).

---

## Variant fields

| Field | Type | Required | Description |
|---|---|:-:|---|
| `id` | string | Yes | Unique within the experiment. Same regex as experiment ID. |
| `label` | string | No | Human-readable. Shown in debug overlay. Max 128 chars. |
| `description` | string | No | Shown in debug overlay. Max 512 chars. |
| `value` | any | No | For `type: "value"` experiments, the value returned by `useVariantValue`. |

### `value`

Any JSON-serializable value. Strings, numbers, booleans, arrays, and objects are all supported. Type safety on the JS/TS side comes via codegen or explicit generic arguments.

---

## Targeting fields

All fields optional. **All specified fields must match** for a user to be eligible. An empty `targeting` object matches all users.

| Field | Type | Description |
|---|---|---|
| `platform` | `("ios" \| "android" \| "web" \| "node")[]` | Match if `context.platform` is in the list. |
| `appVersion` | string | Semver range. Match if `context.appVersion` satisfies. |
| `locale` | string[] | IETF language tags. Exact match or prefix match. |
| `screenSize` | `("small" \| "medium" \| "large")[]` | Match `context.screenSize`. |
| `routes` | string[] | Glob patterns. Match if `context.route` matches any. |
| `userId` | string[] \| hash object | Explicit user list or hash bucket. |
| `attributes` | object | Exact-match predicate on `context.attributes`. |

### Screen-size buckets

Adapter packages auto-derive the bucket from screen dimensions:

- `small`: max(width, height) < 700 px
- `medium`: 700 ≤ max(width, height) < 1200 px
- `large`: max(width, height) ≥ 1200 px

These thresholds are configurable at engine-creation time but have good defaults.

### App version matching

Supports standard semver range syntax:

- `>=1.2.0`
- `^1.2.0` (>= 1.2.0 < 2.0.0)
- `~1.2.0` (>= 1.2.0 < 1.3.0)
- `1.2.0 - 2.0.0` (range)
- `>=1.0.0 <2.0.0 || >=3.0.0` (compound)

Parsed by our hand-rolled semver matcher. See [`docs/research/bundle-size-analysis.md`](../research/bundle-size-analysis.md).

### User ID matching

Two modes:

1. **Explicit list**: `"userId": ["alice", "bob", "charlie"]`
2. **Hash bucket**: `"userId": { "hash": "sha256", "mod": 10 }` — match if `sha256(userId) % 100 < mod` (10% of users)

### Attributes matching

Exact-match predicates on arbitrary user attributes:

```json
"targeting": {
  "attributes": {
    "plan": "premium",
    "region": "us-west",
    "betaOptIn": true
  }
}
```

All specified attributes must match exactly. For complex predicates, use the `targeting.predicate` escape hatch available only in application code, not in JSON.

---

## Rollback fields

| Field | Type | Required | Default | Description |
|---|---|:-:|---|---|
| `threshold` | integer | Yes | `3` | Crashes that trigger rollback. 1-100. |
| `window` | integer | Yes | `60000` | Time window in ms. 1000-3600000. |
| `persistent` | boolean | No | `false` | Persist rollback across sessions. |

When enabled, if a variant crashes `threshold` times within `window` milliseconds, the engine:

1. Clears the user's assignment for that experiment
2. Forces the `default` variant
3. Emits an `onRollback` event
4. If `persistent`, stores the rollback in Storage

See [`docs/features/crash-rollback.md`](../features/crash-rollback.md).

---

## Validation rules

The engine validates configs at load time and rejects:

- **Unknown version** (`version !== 1`)
- **Config larger than 1 MB**
- **Duplicate experiment IDs**
- **Duplicate variant IDs within an experiment**
- **`default` that doesn't match any variant**
- **`split` sum != 100** when assignment is `weighted`
- **Invalid route globs** (unsupported patterns)
- **Invalid semver ranges**
- **Targeting nesting deeper than 10 levels**
- **Invalid ISO 8601 timestamps**
- **Reserved keys** (`__proto__`, `constructor`, `prototype`)

Errors are collected and thrown as a `ConfigValidationError` with an `issues` array.

In fail-open mode (default), the engine logs the error and falls back to returning defaults. In fail-closed mode, it throws.

---

## Examples

### Simple value experiment

```json
{
  "version": 1,
  "experiments": [
    {
      "id": "cta-copy",
      "name": "CTA button copy",
      "type": "value",
      "default": "buy-now",
      "variants": [
        { "id": "buy-now", "value": "Buy now" },
        { "id": "get-started", "value": "Get started" },
        { "id": "try-free", "value": "Try it free" }
      ]
    }
  ]
}
```

### Render experiment with route scope

```json
{
  "version": 1,
  "experiments": [
    {
      "id": "news-card-layout",
      "name": "News card layout",
      "routes": ["/", "/feed"],
      "targeting": { "screenSize": ["small"] },
      "default": "responsive",
      "variants": [
        { "id": "responsive", "label": "Responsive image" },
        { "id": "scale-to-fit", "label": "Scale to fit" },
        { "id": "pip-thumbnail", "label": "PIP thumbnail" }
      ]
    }
  ]
}
```

### Weighted rollout with rollback

```json
{
  "version": 1,
  "experiments": [
    {
      "id": "new-checkout",
      "name": "New checkout flow",
      "assignment": "weighted",
      "split": { "control": 90, "new": 10 },
      "default": "control",
      "variants": [
        { "id": "control" },
        { "id": "new" }
      ],
      "rollback": {
        "threshold": 5,
        "window": 120000,
        "persistent": true
      }
    }
  ]
}
```

### Time-boxed experiment

```json
{
  "version": 1,
  "experiments": [
    {
      "id": "black-friday-banner",
      "name": "Black Friday banner",
      "type": "render",
      "startDate": "2026-11-24T00:00:00Z",
      "endDate": "2026-12-01T00:00:00Z",
      "default": "hidden",
      "variants": [
        { "id": "hidden" },
        { "id": "shown" }
      ]
    }
  ]
}
```

### Targeted beta

```json
{
  "version": 1,
  "experiments": [
    {
      "id": "ai-assistant",
      "name": "AI assistant beta",
      "targeting": {
        "platform": ["ios", "android"],
        "appVersion": ">=2.0.0",
        "attributes": { "betaOptIn": true }
      },
      "default": "disabled",
      "variants": [
        { "id": "disabled" },
        { "id": "enabled" }
      ]
    }
  ]
}
```

---

## Forward compatibility

### Minor version updates

If we add new optional fields in a future release, old configs still work. The engine ignores unknown fields that are backward-compatible by design.

### Major version updates

A breaking change increments the `version` field. The engine refuses to load configs of a newer major version and logs a clear error pointing to the migration guide.

### Migration strategy

We ship a `variantlab migrate` CLI command to upgrade configs between major versions. Migration is always one-way (v1 → v2); we don't support downgrades.

---

## See also

- [`experiments.schema.json`](../../experiments.schema.json) — machine-readable JSON Schema
- [`API.md`](../../API.md) — TypeScript interfaces matching this format
- [`docs/features/codegen.md`](../features/codegen.md) — how configs become types
- [`docs/features/targeting.md`](../features/targeting.md) — targeting predicate semantics
