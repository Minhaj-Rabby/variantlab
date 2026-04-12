# Multivariate experiments

Running experiments with 3 or more variants, including weighted splits and mutually exclusive groups.

## Table of contents

- [What is a multivariate experiment](#what-is-a-multivariate-experiment)
- [When to use one](#when-to-use-one)
- [Defining 3+ variants](#defining-3-variants)
- [Weighted splits](#weighted-splits)
- [Mutual exclusion](#mutual-exclusion)
- [Statistical considerations](#statistical-considerations)
- [Real-world examples](#real-world-examples)

---

## What is a multivariate experiment

An experiment with more than 2 variants. In the classic A/B sense, it's an "A/B/C/D/..." test. variantlab treats all experiments uniformly — whether you have 2 variants or 30, the config and API are the same.

**Upper limit**: 100 variants per experiment. More than that and the picker UI becomes unusable anyway.

---

## When to use one

### Good fits

- **Copy testing with many candidates** — "Buy now", "Get started", "Try free", "Start trial", "Shop now"
- **Layout exploration** — the Drishtikon 30 card modes
- **Color palette experiments** — 5 palettes, pick the best
- **Pricing sweeps** — $4.99, $6.99, $9.99, $14.99
- **Feature sets** — "minimal", "standard", "all features"

### Bad fits

- **Anything with fewer than 100 users per variant** — statistical noise will dominate. Stick to 2 variants.
- **When variants are very different** — measuring differences becomes meaningless if variants are apples and oranges. Split into multiple experiments.
- **When you don't have a success metric** — multivariate tests burn traffic. Without a clear metric, you're just randomly showing different UIs.

---

## Defining 3+ variants

Just add more variants to the array:

```json
{
  "id": "cta-copy",
  "type": "value",
  "default": "buy-now",
  "variants": [
    { "id": "buy-now", "value": "Buy now" },
    { "id": "get-started", "value": "Get started" },
    { "id": "try-free", "value": "Try it free" },
    { "id": "start-trial", "value": "Start your trial" },
    { "id": "shop-now", "value": "Shop now" }
  ]
}
```

No special config. The assignment strategy handles the rest.

### With the render-prop component

```tsx
<Variant experimentId="cta-copy">
  {{
    "buy-now": <Button>Buy now</Button>,
    "get-started": <Button>Get started</Button>,
    "try-free": <Button>Try it free</Button>,
    "start-trial": <Button>Start your trial</Button>,
    "shop-now": <Button>Shop now</Button>,
  }}
</Variant>
```

TypeScript enforces exhaustiveness — missing any key is a compile error with codegen active.

---

## Weighted splits

By default, multivariate experiments split traffic evenly. To customize, use `assignment: "weighted"` with a `split`:

```json
{
  "id": "cta-copy",
  "assignment": "weighted",
  "split": {
    "buy-now": 40,
    "get-started": 30,
    "try-free": 20,
    "start-trial": 5,
    "shop-now": 5
  },
  "default": "buy-now",
  "variants": [...]
}
```

Rules:

- All variant IDs must appear in `split`
- Values are integer percentages
- Must sum to exactly 100
- Assignment is deterministic via sticky-hash of `(userId, experimentId)`

### Staged rollout pattern

Start with a heavy default:

```json
"split": { "buy-now": 90, "get-started": 5, "try-free": 5 }
```

Gradually shift traffic:

```json
"split": { "buy-now": 50, "get-started": 25, "try-free": 25 }
```

Until the winner is clear:

```json
"split": { "buy-now": 0, "get-started": 100, "try-free": 0 }
```

Then archive the experiment and bake the winner into the code.

### Zero-percent variants

A variant with `0` in the split still appears in config, still has types generated, but never gets assigned. Useful for:

- Temporary kill switches on one arm
- Preparing a variant before ramping it up

---

## Mutual exclusion

When two experiments should never run on the same user:

```json
{ "id": "card-layout-a", "mutex": "card-layout", ... },
{ "id": "card-layout-b", "mutex": "card-layout", ... },
{ "id": "card-layout-c", "mutex": "card-layout", ... }
```

All three experiments with `mutex: "card-layout"` form a group. A single user is enrolled in **at most one** experiment from the group, chosen by stable hash.

### Why?

Competing experiments can interact:

- Two card-layout experiments both redesign the card; which one won?
- Two onboarding experiments both change flow; which did the user complete?

Mutex groups prevent interactions by ensuring one wins per user.

### Rules

- All experiments in a mutex group must have the same targeting (or else the "winner" is unpredictable)
- A user who matches multiple experiments gets exactly one, deterministically
- The choice is stable across sessions (sticky-hash)
- Debug overlay shows mutex status on each experiment card

---

## Statistical considerations

variantlab does not ship analytics. But we have opinions about how to run multivariate tests.

### Traffic cost

With 5 variants and an even split, each variant gets 20% of your traffic. To reach statistical significance, you need 5x the users a 2-variant test would need.

Rule of thumb: **fewer variants is better**. Only use multivariate if you're explicitly exploring a design space.

### Winner selection

Don't pick a winner until:

- Each variant has at least 1000 exposures (per your metric)
- The p-value is below 0.05 (your telemetry tool should compute this)
- The effect is practically significant, not just statistically

### Holdout arm

Consider keeping a "control" variant at a fixed percentage (e.g., 10%) even after picking a winner. This lets you measure long-term effects vs. the original baseline.

```json
"split": {
  "control": 10,
  "new-winner": 90
}
```

### Novelty effects

Users react to any change. Measure at least 2 weeks post-launch, not just the first day.

---

## Real-world examples

### Drishtikon card layout (30 variants)

The origin story. See [`origin-story.md`](../research/origin-story.md).

```json
{
  "id": "news-card-detailed-layout",
  "type": "render",
  "default": "responsive-image",
  "assignment": "default",
  "variants": [
    { "id": "responsive-image", "label": "Responsive image" },
    { "id": "no-scroll", "label": "No scroll" },
    { "id": "tap-collapse", "label": "Tap to collapse" },
    { "id": "drag-handle", "label": "Drag handle" },
    { "id": "scale-to-fit", "label": "Scale to fit" },
    { "id": "pip-thumbnail", "label": "Picture-in-picture" },
    // ... 24 more
  ]
}
```

During development, `assignment: "default"` means everyone sees the default and the developer uses the debug overlay to switch manually. Once the best variant is identified, the experiment is archived and the winner is baked in.

### Pricing experiment (4 variants)

```json
{
  "id": "pro-monthly-price",
  "type": "value",
  "assignment": "weighted",
  "split": {
    "low": 25,
    "mid-low": 25,
    "mid-high": 25,
    "high": 25
  },
  "default": "mid-low",
  "variants": [
    { "id": "low", "value": 4.99 },
    { "id": "mid-low", "value": 7.99 },
    { "id": "mid-high", "value": 9.99 },
    { "id": "high", "value": 12.99 }
  ],
  "targeting": { "attributes": { "isNewUser": true } }
}
```

Shows different prices to new users to find the optimum.

### Onboarding flow (3 variants)

```json
{
  "id": "onboarding-flow",
  "type": "render",
  "assignment": "weighted",
  "split": {
    "current": 50,
    "3-step": 25,
    "1-page": 25
  },
  "default": "current",
  "mutex": "onboarding",
  "variants": [
    { "id": "current", "label": "Current flow" },
    { "id": "3-step", "label": "3 steps" },
    { "id": "1-page", "label": "Single page" }
  ]
}
```

Mutex ensures the onboarding test doesn't collide with a future onboarding experiment.

---

## Debugging multivariate experiments

### Debug overlay

Shows:

- All variants of the experiment
- Which one is currently active
- Why (targeting, assignment, override)
- A picker to switch manually

### Eval CLI

```bash
variantlab eval experiments.json \
  --experiment cta-copy \
  --context '{"userId":"alice"}'
```

Output:

```
Experiment: cta-copy
  Targeting: ✅ pass (no targeting)
  Assignment: weighted
  Variant: get-started (40% bucket)
  Value: "Get started"
```

### Variant distribution check

```bash
variantlab distribution experiments.json \
  --experiment cta-copy \
  --users 10000
```

Output:

```
cta-copy distribution over 10000 simulated users:
  buy-now:     4028  (40.3%)  expected: 40%  ✅
  get-started: 3012  (30.1%)  expected: 30%  ✅
  try-free:    1987  (19.9%)  expected: 20%  ✅
  start-trial:  491  (4.9%)   expected: 5%   ✅
  shop-now:     482  (4.8%)   expected: 5%   ✅
```

Useful for verifying the assignment logic is working correctly.

---

## See also

- [`config-format.md`](../design/config-format.md) — the `split` and `mutex` fields
- [`value-experiments.md`](./value-experiments.md) — when variants are values
- [`targeting.md`](./targeting.md) — scoping multivariate tests
