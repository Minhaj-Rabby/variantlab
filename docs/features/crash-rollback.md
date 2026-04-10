# Crash-triggered automatic rollback

A variant that crashes should not keep crashing your users. variantlab's crash-rollback feature detects errors in a variant, clears the assignment, and forces the default.

## Table of contents

- [Why this exists](#why-this-exists)
- [How it works](#how-it-works)
- [Configuration](#configuration)
- [The VariantErrorBoundary](#the-varianterrorboundary)
- [Programmatic reporting](#programmatic-reporting)
- [Persistence](#persistence)
- [Events](#events)
- [Debugging a rollback](#debugging-a-rollback)
- [Limitations](#limitations)

---

## Why this exists

Real-world story from Drishtikon: we shipped a new card layout that crashed when a particular article had no hero image. The crash affected 100% of users in that variant until we shipped a new config.

With crash-rollback, the second crash would have automatically cleared the assignment and forced the default. No user would have seen more than one crash.

This is the safety net that lets teams ship risky experiments with confidence.

---

## How it works

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Variant A  │────▶│ ErrorBoundary│────▶│ reportCrash  │
└─────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                ▼
                                       ┌──────────────────┐
                                       │ Count crashes    │
                                       │ in time window   │
                                       └──────────────────┘
                                                │
                                                ▼
                                  ┌──────────────────────────┐
                                  │ Threshold reached?       │
                                  │   Yes → rollback          │
                                  │   No → keep trying        │
                                  └──────────────────────────┘
                                                │
                                                ▼
                                  ┌──────────────────────────┐
                                  │ Clear assignment         │
                                  │ Force default            │
                                  │ Emit onRollback event    │
                                  │ Persist (optional)       │
                                  └──────────────────────────┘
```

1. You wrap the variant in `<VariantErrorBoundary>`
2. A crash is caught and reported to the engine
3. The engine maintains a per-(experiment, variant, user) crash counter within a sliding window
4. When `threshold` crashes occur within `window` ms, the engine:
   - Clears the user's assignment for that experiment
   - Forces the `default` variant on the next resolve
   - Emits an `onRollback` event
   - Optionally persists the rollback so future sessions stay on default

---

## Configuration

Per-experiment, in `experiments.json`:

```json
{
  "id": "news-card-layout",
  "default": "responsive",
  "variants": [
    { "id": "responsive" },
    { "id": "new-risky-layout" }
  ],
  "rollback": {
    "threshold": 3,
    "window": 60000,
    "persistent": false
  }
}
```

### `threshold`

Number of crashes that trigger rollback. Integer, 1-100. Default: 3.

- **Lower** = more aggressive (rollback after fewer crashes)
- **Higher** = more forgiving (tolerates flaky crashes)

For high-risk experiments, start at 2. For low-risk, 5-10 is fine.

### `window`

Time window in milliseconds. Integer, 1000-3600000 (1s to 1h). Default: 60000 (1 min).

Crashes outside this window don't count. A variant that crashes once an hour is probably fine; a variant that crashes 3 times in 60 seconds is not.

### `persistent`

Boolean. Default: `false`.

- **`false`**: rollback is in-memory only. Restart the app and the user may get the variant again.
- **`true`**: rollback is written to Storage. Even after app restart, the user stays on default.

Persistent rollbacks are cleared when the engine updates to a new config (presumably with the fix).

### Global defaults

You can set engine-level defaults:

```ts
createEngine(config, {
  rollbackDefaults: {
    threshold: 3,
    window: 60000,
    persistent: false,
  },
});
```

Per-experiment config overrides the defaults.

---

## The VariantErrorBoundary

Wrap your variant subtree in an error boundary:

```tsx
import { VariantErrorBoundary, Variant } from "@variantlab/react";

<VariantErrorBoundary experimentId="news-card-layout">
  <Variant experimentId="news-card-layout">
    {{
      responsive: <ResponsiveCard />,
      "new-risky-layout": <NewRiskyLayout />,
    }}
  </Variant>
</VariantErrorBoundary>
```

When the child throws:

1. The boundary catches the error
2. It calls `engine.reportCrash(experimentId, variantId, error)`
3. It renders a fallback (either the default variant or your custom fallback)
4. If the rollback threshold is hit, the engine forces the default

### Custom fallback

```tsx
<VariantErrorBoundary
  experimentId="news-card-layout"
  fallback={(error, variantId) => (
    <ErrorCard message="Something went wrong" />
  )}
>
  <Variant experimentId="news-card-layout">...</Variant>
</VariantErrorBoundary>
```

### Rendering the default on error

By default, after a crash, the boundary re-renders with the default variant:

```tsx
<VariantErrorBoundary experimentId="news-card-layout" renderDefaultOnCrash>
  ...
</VariantErrorBoundary>
```

This is the recommended pattern — the user sees the working default, not a generic error.

### Nested boundaries

You can nest multiple boundaries for different experiments. Each one is scoped to its `experimentId`:

```tsx
<VariantErrorBoundary experimentId="top-nav">
  <TopNavExperiment />
  <VariantErrorBoundary experimentId="card-layout">
    <CardLayoutExperiment />
  </VariantErrorBoundary>
</VariantErrorBoundary>
```

A crash in `card-layout` won't trigger a rollback on `top-nav`.

---

## Programmatic reporting

If you can't use an error boundary (e.g., async errors, native crashes, worker errors), report directly:

```ts
import { useVariantLabEngine } from "@variantlab/react";

const engine = useVariantLabEngine();

try {
  await riskyOperation();
} catch (error) {
  engine.reportCrash("news-card-layout", currentVariant, error);
  throw error;
}
```

### Global error handler

```ts
window.addEventListener("error", (event) => {
  if (event.error?.variantlabExperimentId) {
    engine.reportCrash(
      event.error.variantlabExperimentId,
      event.error.variantlabVariantId,
      event.error,
    );
  }
});
```

Or on React Native:

```ts
ErrorUtils.setGlobalHandler((error, isFatal) => {
  // inspect the error and call engine.reportCrash if applicable
});
```

---

## Persistence

When `persistent: true`, rollback state is stored in the engine's Storage adapter under a key like:

```
@variantlab/rollback:news-card-layout:user-123
```

The value includes:

- The rolled-back variant ID
- The timestamp of the rollback
- The crash count that triggered it

### When is it cleared?

- **On config update**: if the config version changes (i.e., a new config is loaded), the rollback is cleared. The assumption is that the new config includes the fix.
- **Manually**: `engine.clearRollback(experimentId)` or via the debug overlay
- **On `resetAll()`**

### Why clear on config update?

Because the whole point of a rollback is to protect users until a fix ships. Once the fix is in a new config, the user should be re-enrolled.

If you don't want this behavior, set `persistent: "forever"`:

```json
"rollback": { "threshold": 3, "window": 60000, "persistent": "forever" }
```

This keeps the rollback until explicit clearing.

---

## Events

Rollbacks fire an event on the engine's event bus:

```ts
engine.on("rollback", (event) => {
  console.log("Rollback triggered:", event);
  // {
  //   experimentId: "news-card-layout",
  //   variantId: "new-risky-layout",
  //   reason: "threshold-exceeded",
  //   crashCount: 3,
  //   window: 60000,
  //   userId: "user-123",
  //   timestamp: 1739500000000,
  // }
});
```

Use this to:

- Forward to your telemetry (e.g., Sentry, Datadog)
- Alert on-call via PagerDuty
- Increment a rollback counter in your metrics pipeline

### Telemetry integration

If you configure a telemetry provider, rollback events are forwarded automatically:

```ts
createEngine(config, {
  telemetry: {
    track(event, properties) {
      posthog.capture(event, properties);
    },
  },
});
```

---

## Debugging a rollback

### Debug overlay

The overlay's **Events** tab shows rollback events in real time. Each entry has:

- Experiment ID
- Variant that crashed
- Crash count
- Timestamp
- "View stack trace" button

### Crash history

The overlay's **History** tab shows past rollbacks with timestamps. See [`time-travel.md`](./time-travel.md).

### Programmatic inspection

```ts
const rollbacks = engine.getRollbacks();
// [
//   { experimentId: "news-card-layout", variantId: "new-risky-layout", ... }
// ]
```

### Manually clearing

From the overlay: tap the experiment card → overflow menu → "Clear rollback".

Programmatically:

```ts
engine.clearRollback("news-card-layout");
// or
engine.resetAll();
```

---

## Limitations

### What we can detect

- **React render errors** — caught by ErrorBoundary
- **Event handler errors** — caught by ErrorBoundary (React 19+)
- **Promise rejections inside effects** — caught if you wrap in try/catch and report manually
- **Global JS errors** — caught if you register a global handler and report manually

### What we cannot detect

- **Native crashes** (iOS/Android native layer) — these bypass JavaScript entirely
- **Memory leaks** that don't throw — not an error, just slow
- **Infinite loops** — the app hangs, no error is thrown
- **Crashes in the engine itself** — if variantlab's code crashes, the rollback system can't run

For the first and last cases, pair variantlab with Sentry or Crashlytics to get native crash reports and manually update your config when you see a surge.

### False positives

A variant that legitimately errors once in a while (e.g., transient network failures) may trigger a rollback even though the variant is fine. Mitigation:

- Use a higher `threshold`
- Use a longer `window`
- Don't report network errors as variant crashes

### Race conditions

If the same user has the same experiment rendered in 3 places simultaneously and all 3 crash, that's 3 crash reports in milliseconds. The threshold counts real reports, so 3 concurrent reports count as 3 crashes. This is usually desired — 3 crashes in a frame is worse than 3 crashes over a minute.

---

## Best practices

1. **Wrap risky experiments** — always use `VariantErrorBoundary` around experimental components
2. **Tune thresholds** — higher threshold for low-risk experiments, lower for high-risk
3. **Always set a working default** — the whole point of rollback is to fall back to the default
4. **Forward to telemetry** — don't just rollback silently; alert the team
5. **Test the rollback** — in dev, inject a crash and verify the rollback triggers
6. **Clear rollbacks on fix** — ship a new config version and the rollback auto-clears

---

## See also

- [`API.md`](../../API.md) — `VariantErrorBoundary` props
- [`origin-story.md`](../research/origin-story.md) — the crashing card that inspired this feature
- [`hmac-signing.md`](./hmac-signing.md) — making sure rollback configs aren't tampered with
