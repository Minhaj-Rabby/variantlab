# Value experiments

How to use variantlab as a feature-flag / remote-config tool. Value experiments return values, not components.

## Table of contents

- [The two experiment types](#the-two-experiment-types)
- [When to use value experiments](#when-to-use-value-experiments)
- [Defining a value experiment](#defining-a-value-experiment)
- [Reading the value](#reading-the-value)
- [Type inference](#type-inference)
- [Supported value types](#supported-value-types)
- [Feature flag patterns](#feature-flag-patterns)
- [Remote config patterns](#remote-config-patterns)
- [Gotchas](#gotchas)

---

## The two experiment types

variantlab supports two kinds of experiments:

| Type | Purpose | Hook | Component |
|---|---|---|---|
| `"render"` | Swap components | `useVariant` | `<Variant>` |
| `"value"` | Return values | `useVariantValue` | `<VariantValue>` |

They share the same config format, targeting, rollback, and debug UX. The only difference is the `type` field and whether variants carry a `value`.

---

## When to use value experiments

Use `type: "value"` when:

- The experiment changes **data**, not structure (copy, colors, numbers, URLs, feature flags)
- You want to read the value in multiple places without duplicating render logic
- The variants are primitives, arrays, or JSON objects
- You want a classic "feature flag" API

Use `type: "render"` when:

- The experiment changes **components** (different layouts, different UIs)
- You want exhaustive type checking on variant → component mapping
- Each variant has its own JSX tree

---

## Defining a value experiment

```json
{
  "id": "cta-copy",
  "type": "value",
  "default": "buy-now",
  "variants": [
    { "id": "buy-now", "value": "Buy now" },
    { "id": "get-started", "value": "Get started" },
    { "id": "try-free", "value": "Try it free" }
  ]
}
```

- `type: "value"` is required (or it will be treated as a render experiment)
- Each variant MUST have a `value` field
- `value` can be any JSON-serializable type (string, number, boolean, array, object, null)
- All variants should have the same value shape (enforced by codegen, not the runtime)

### A boolean feature flag

```json
{
  "id": "ai-assistant-enabled",
  "type": "value",
  "default": "off",
  "variants": [
    { "id": "off", "value": false },
    { "id": "on", "value": true }
  ]
}
```

### A number

```json
{
  "id": "max-articles-per-page",
  "type": "value",
  "default": "default",
  "variants": [
    { "id": "default", "value": 10 },
    { "id": "larger", "value": 20 },
    { "id": "smaller", "value": 5 }
  ]
}
```

### A JSON object

```json
{
  "id": "homepage-layout-config",
  "type": "value",
  "default": "v1",
  "variants": [
    {
      "id": "v1",
      "value": {
        "heroVisible": true,
        "trendingCount": 10,
        "sidebarAds": false
      }
    },
    {
      "id": "v2",
      "value": {
        "heroVisible": false,
        "trendingCount": 20,
        "sidebarAds": true
      }
    }
  ]
}
```

### An array

```json
{
  "id": "feature-order",
  "type": "value",
  "default": "default",
  "variants": [
    { "id": "default", "value": ["news", "videos", "opinions"] },
    { "id": "reordered", "value": ["videos", "news", "opinions"] }
  ]
}
```

---

## Reading the value

### Hook

```ts
import { useVariantValue } from "@variantlab/react";

const copy = useVariantValue("cta-copy");
// With codegen: "Buy now" | "Get started" | "Try it free"
// Without codegen: string
```

### Component

```tsx
import { VariantValue } from "@variantlab/react";

<VariantValue experimentId="cta-copy">
  {(copy) => <Button>{copy}</Button>}
</VariantValue>
```

Useful for avoiding hook rules in conditional contexts.

### Server-side

```ts
import { getVariantValueSSR } from "@variantlab/next";

const copy = await getVariantValueSSR("cta-copy", context);
```

---

## Type inference

With codegen active, the return type is inferred from the config:

```json
{
  "id": "theme",
  "type": "value",
  "default": "light",
  "variants": [
    { "id": "light", "value": "light" },
    { "id": "dark", "value": "dark" },
    { "id": "auto", "value": "auto" }
  ]
}
```

```ts
const theme = useVariantValue("theme");
// theme: "light" | "dark" | "auto"
```

For JSON objects, the type is a union of the object shapes:

```json
{
  "id": "pricing",
  "type": "value",
  "variants": [
    { "id": "a", "value": { "price": 9.99, "label": "Basic" } },
    { "id": "b", "value": { "price": 14.99, "label": "Pro" } }
  ]
}
```

```ts
const pricing = useVariantValue("pricing");
// pricing: { price: 9.99; label: "Basic" } | { price: 14.99; label: "Pro" }
// or more usefully: { price: number; label: string }
```

The codegen emits a union by default; users can widen it manually.

### Without codegen

```ts
const theme = useVariantValue<"light" | "dark" | "auto">("theme");
```

---

## Supported value types

All JSON-serializable types:

- **string**
- **number**
- **boolean**
- **null**
- **array** of the above
- **object** of the above (nested)

### Not supported

- **Functions** — configs are JSON
- **Dates** — pass ISO strings instead
- **Regex** — pass string patterns, compile in the app
- **undefined** — use `null` or omit the value
- **Symbols**, **BigInt**, **Maps**, **Sets** — not JSON-compatible

If you need a non-serializable value, read a serializable key and map it in the app:

```ts
const themeName = useVariantValue("theme");
const themeColors = themeMap[themeName];
```

---

## Feature flag patterns

variantlab as a feature flag system:

### Boolean flag

```json
{
  "id": "ai-tab-enabled",
  "type": "value",
  "default": "off",
  "variants": [
    { "id": "off", "value": false },
    { "id": "on", "value": true }
  ]
}
```

```tsx
const enabled = useVariantValue("ai-tab-enabled");
return enabled ? <AITab /> : null;
```

### Staged rollout

```json
{
  "id": "new-checkout",
  "type": "value",
  "assignment": "weighted",
  "split": { "off": 90, "on": 10 },
  "default": "off",
  "variants": [
    { "id": "off", "value": false },
    { "id": "on", "value": true }
  ]
}
```

Start at 10%, increase the `split` over time:

```json
"split": { "off": 50, "on": 50 }
```

```json
"split": { "off": 0, "on": 100 }
```

### Kill switch

Set `enabled: false` at the top level to instantly disable all experiments:

```json
{
  "version": 1,
  "enabled": false,
  "experiments": [...]
}
```

Or archive a specific one:

```json
{ "id": "new-checkout", "status": "archived", ... }
```

Archived experiments always return their default.

### Targeted beta

```json
{
  "id": "ai-assistant-beta",
  "type": "value",
  "default": "off",
  "targeting": { "attributes": { "betaOptIn": true } },
  "variants": [
    { "id": "off", "value": false },
    { "id": "on", "value": true }
  ]
}
```

Only users with `betaOptIn: true` see the feature.

---

## Remote config patterns

variantlab as a remote-config tool:

### Dynamic text

```json
{
  "id": "welcome-banner-text",
  "type": "value",
  "default": "default",
  "variants": [
    { "id": "default", "value": "Welcome to Drishtikon" },
    { "id": "holiday", "value": "Happy New Year!" }
  ]
}
```

### Dynamic URLs

```json
{
  "id": "api-endpoint",
  "type": "value",
  "default": "prod",
  "variants": [
    { "id": "prod", "value": "https://api.example.com" },
    { "id": "staging", "value": "https://staging.example.com" }
  ]
}
```

### Dynamic pricing

```json
{
  "id": "premium-price",
  "type": "value",
  "assignment": "weighted",
  "split": { "low": 25, "mid": 50, "high": 25 },
  "default": "mid",
  "variants": [
    { "id": "low", "value": 4.99 },
    { "id": "mid", "value": 9.99 },
    { "id": "high", "value": 14.99 }
  ]
}
```

### Time-boxed promotions

```json
{
  "id": "black-friday-discount",
  "type": "value",
  "startDate": "2026-11-24T00:00:00Z",
  "endDate": "2026-12-01T00:00:00Z",
  "default": "off",
  "variants": [
    { "id": "off", "value": 0 },
    { "id": "on", "value": 0.25 }
  ]
}
```

---

## Gotchas

### Value experiments don't render exhaustive

If you use `useVariantValue` + a switch statement, you can miss cases. The type system will not catch it unless you explicitly narrow:

```ts
const theme = useVariantValue("theme");
if (theme === "light") return <Light />;
if (theme === "dark") return <Dark />;
// forgot "auto" — no compile error unless you use exhaustive checks
```

For exhaustiveness, use `<Variant>` with `type: "render"` instead:

```tsx
<Variant experimentId="theme">
  {{
    light: <Light />,
    dark: <Dark />,
    auto: <Auto />, // ❌ error if missing
  }}
</Variant>
```

### Mixing types across variants

The runtime doesn't enforce that all variants have the same value shape. You can do this:

```json
"variants": [
  { "id": "a", "value": "string" },
  { "id": "b", "value": 42 },
  { "id": "c", "value": true }
]
```

But it's a bad idea — your consumer code will have to handle `string | number | boolean` everywhere. Codegen will flag this with a linter warning.

### Default value must be in the variants list

```json
"default": "premium", // ❌ error if "premium" is not a variant ID
"variants": [
  { "id": "basic", "value": "..." },
  { "id": "pro", "value": "..." }
]
```

The validator catches this at config load time.

### Don't store sensitive data

Variant values are visible in the debug overlay, in network requests (if served remotely), and in the app bundle (if embedded). Don't put API keys, tokens, or secrets in variant values. Use environment variables for those.

---

## Comparison with other tools

| Tool | Feature flags | Multi-value | JSON values | Codegen |
|---|:-:|:-:|:-:|:-:|
| variantlab | ✅ | ✅ | ✅ | ✅ |
| Firebase Remote Config | ✅ | ⚠️ | ⚠️ | ❌ |
| LaunchDarkly | ✅ | ✅ | ✅ | ⚠️ enterprise |
| Statsig | ✅ | ✅ | ✅ | ⚠️ |
| GrowthBook | ✅ | ✅ | ✅ | ❌ |
| Unleash | ✅ | ❌ | ❌ | ❌ |
| ConfigCat | ✅ | ⚠️ | ⚠️ | ❌ |

variantlab is the only tool that combines full value-experiment support with local codegen and zero network dependency.

---

## See also

- [`killer-features.md`](./killer-features.md#4-value-and-render-experiments) — the differentiator
- [`multivariate.md`](./multivariate.md) — 3+ variant experiments
- [`codegen.md`](./codegen.md) — type-safe values
