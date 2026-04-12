# Time-travel inspector

Scrub backwards through variant history to see what was active at any point in a session.

## Table of contents

- [Why time travel](#why-time-travel)
- [What gets recorded](#what-gets-recorded)
- [The history tab](#the-history-tab)
- [Programmatic access](#programmatic-access)
- [Replay mode](#replay-mode)
- [Storage and size limits](#storage-and-size-limits)
- [Privacy](#privacy)

---

## Why time travel

Debugging variant-related issues is hard because the state changes silently:

- A user switches variants via a deep link
- A crash triggers a rollback
- Targeting changes when the user navigates
- A remote config update reassigns everyone

Without a history, "why did I see the wrong variant at 3:45pm?" is unanswerable.

With time travel, the debug overlay shows a scrollable timeline of every assignment, override, and rollback with timestamps and causes.

This is inspired by Redux DevTools' time-travel, but for variant state.

---

## What gets recorded

The engine maintains an in-memory ring buffer of events:

```ts
type HistoryEvent =
  | { type: "configLoaded"; config: ExperimentsConfig; timestamp: number }
  | { type: "contextUpdated"; context: VariantContext; timestamp: number }
  | { type: "assignment"; experimentId: string; variantId: string; reason: AssignmentReason; timestamp: number }
  | { type: "exposure"; experimentId: string; variantId: string; route: string; timestamp: number }
  | { type: "override"; experimentId: string; variantId: string; source: OverrideSource; timestamp: number }
  | { type: "rollback"; experimentId: string; variantId: string; crashCount: number; timestamp: number }
  | { type: "reset"; experimentId?: string; timestamp: number };
```

### `configLoaded`

Fires when the engine loads a new config (from local cache or remote). Includes the full config snapshot.

### `contextUpdated`

Fires when the context changes (route change, user login, attribute update). Includes the new context.

### `assignment`

Fires when a user is assigned a variant for the first time. Records the `reason`:

- `"targeting-match-default"` — targeting passed, default assignment
- `"targeting-match-random"` — targeting passed, random assignment
- `"targeting-match-weighted"` — targeting passed, weighted pick
- `"targeting-match-sticky"` — targeting passed, sticky hash
- `"targeting-miss"` — targeting failed, default returned
- `"kill-switch"` — kill switch on, default returned
- `"archived"` — experiment archived, default returned
- `"rollback"` — previously rolled back, default returned

### `exposure`

Fires when a variant is actually read by application code (`useVariant` called). This is separate from `assignment` — you can be assigned without being exposed (e.g., the component isn't mounted). Useful for deduplication when forwarding to telemetry.

### `override`

Fires when a manual override is set:

- `"user-dev-overlay"` — set via debug overlay
- `"deep-link"` — set via deep link / QR
- `"api"` — set via `engine.setVariant()`
- `"initial-context"` — set via provider props

### `rollback`

Fires when the rollback threshold is hit. See [`crash-rollback.md`](./crash-rollback.md).

### `reset`

Fires when assignments are cleared (manually via overlay or programmatically). If `experimentId` is set, it's a targeted reset; otherwise a global reset.

---

## The history tab

In the debug overlay, the "History" tab shows the event stream:

```
┌─────────────────────────────────────────────────────┐
│ History                                [◀ ▶ ▶▶]     │
├─────────────────────────────────────────────────────┤
│ 12:34:56.123  assignment                            │
│   news-card-layout → pip-thumbnail                  │
│   reason: targeting-match-weighted                  │
├─────────────────────────────────────────────────────┤
│ 12:34:58.456  contextUpdated                        │
│   route: /feed → /article/abc                       │
├─────────────────────────────────────────────────────┤
│ 12:35:01.789  exposure                              │
│   theme → dark                                      │
├─────────────────────────────────────────────────────┤
│ 12:35:10.234  rollback                              │
│   news-card-layout ← pip-thumbnail (3 crashes)      │
├─────────────────────────────────────────────────────┤
│ 12:35:10.235  assignment                            │
│   news-card-layout → responsive                     │
│   reason: rollback                                  │
└─────────────────────────────────────────────────────┘
```

Each row is tappable to see details (stack trace for rollbacks, context snapshot for assignments).

### Playback controls

- **◀** — jump to start of session
- **◀** — previous event
- **⏸** — pause
- **▶** — next event
- **▶▶** — jump to now (live tail)
- **⏯** — auto-play (1 event/sec)

In playback mode, the overlay shows the state **as of** the selected event. This doesn't affect the running app — it's a read-only view.

### Filter

The history tab supports filtering by:

- Event type
- Experiment ID
- Time range

### Export

Export the history as JSON for attaching to bug reports:

```json
[
  {
    "type": "assignment",
    "experimentId": "news-card-layout",
    "variantId": "pip-thumbnail",
    "reason": "targeting-match-weighted",
    "timestamp": 1739500000123
  },
  ...
]
```

---

## Programmatic access

```ts
const engine = useVariantLabEngine();
const history = engine.getHistory();
// Returns all events since session start

const filtered = history.filter(
  (e) => e.type === "rollback" || e.type === "override"
);
```

### Subscribing to new events

```ts
const unsubscribe = engine.onHistoryEvent((event) => {
  console.log("New history event:", event);
  // Forward to Sentry, Datadog, etc.
});
```

### Clearing history

```ts
engine.clearHistory();
// Does not affect assignments, only the event log
```

---

## Replay mode

An advanced developer feature: replay a recorded session against a different config.

```ts
import { replaySession } from "@variantlab/core/replay";

const recorded = JSON.parse(await readFile("session.json", "utf8"));
const newConfig = JSON.parse(await readFile("experiments.v2.json", "utf8"));

const result = replaySession(recorded, newConfig);
// {
//   events: [...],
//   differences: [
//     { experimentId: "foo", old: "a", new: "b" }
//   ]
// }
```

Useful for:

- "What would this user have seen under the new config?"
- Regression testing ("do any users change assignment between v1 and v2?")
- Migration validation

Replay mode is pure — it doesn't touch the engine state or any storage.

---

## Storage and size limits

### Ring buffer

History is stored in-memory only by default. The ring buffer size is:

- **500 events** (configurable via engine options)
- Older events are discarded

### Bounded memory

Each event is small (~100-300 bytes). 500 events is ~150 KB max. Negligible.

### Optional persistence

```ts
createEngine(config, {
  history: {
    persistent: true,
    maxEvents: 1000,
  },
});
```

When persistent, history is written to Storage on each event. Reading on boot restores the previous session's history. Useful for post-crash diagnosis.

### Automatic compression

In persistent mode, old events are gzip-compressed every 100 events to save space.

---

## Privacy

### What's recorded

- Experiment IDs
- Variant IDs
- Contexts (platform, app version, route, locale, screen size)
- User IDs (hashed)
- Attribute keys and values

### What's NOT recorded

- Full URLs (only route paths)
- Full user identifiers (only hashes)
- PII in attributes (we can't detect this — you're responsible for not putting PII in attributes)
- Telemetry data
- Stack traces in production (only in dev)

### Redaction

For safe export, redact before sharing:

```ts
const exported = engine.getHistory().map((event) =>
  redactPII(event, { redactKeys: ["email", "phone"] })
);
```

### Production history

By default, history is **disabled** in production builds. Enable it explicitly:

```ts
createEngine(config, {
  history: { enabled: true },
});
```

Even when enabled, history is in-memory only unless you explicitly opt-in to persistence. This aligns with the privacy-by-default principle.

---

## Cost

- **Bundle size**: ~800 bytes (tree-shaken when unused)
- **Runtime**: ring buffer append is O(1)
- **Memory**: < 200 KB for default buffer size
- **Storage**: 0 unless `persistent: true`

---

## See also

- [`debug-overlay.md`](./debug-overlay.md) — where the history tab lives
- [`crash-rollback.md`](./crash-rollback.md) — rollback events in the history
- [`API.md`](../../API.md) — `getHistory`, `onHistoryEvent`
