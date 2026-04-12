# Debug overlay

The on-device debug overlay is variantlab's signature feature. This document describes the design, the UX, and the security constraints.

## Table of contents

- [What it is](#what-it-is)
- [UX design](#ux-design)
- [Production safety](#production-safety)
- [Activation modes](#activation-modes)
- [Information architecture](#information-architecture)
- [Customization](#customization)
- [Accessibility](#accessibility)

---

## What it is

`<VariantDebugOverlay>` is a component that renders a floating button plus a bottom-sheet picker. In dev builds, you mount it once at the root:

```tsx
import { VariantDebugOverlay } from "@variantlab/react-native";

export default function App() {
  return (
    <VariantLabProvider>
      <MainApp />
      {__DEV__ && <VariantDebugOverlay />}
    </VariantLabProvider>
  );
}
```

When the user taps the floating button (or shakes the device, if enabled), a bottom sheet slides up showing every experiment active on the current route.

---

## UX design

### Floating button

- 48×48 circle, absolute positioned
- Configurable corner: `top-left`, `top-right`, `bottom-left`, `bottom-right`
- Configurable offset from edges
- Shows a badge with the count of active experiments on the current route
- Long-press reveals a tooltip: "variantlab debug overlay"
- Respects safe-area insets

### Bottom sheet picker

- Slides up from the bottom on tap
- Dims the background (tap to dismiss)
- Max height: 85% of screen
- Contains:
  1. A header bar with title + close button
  2. A search input (filters by experiment name/ID)
  3. A toggle: "Current route only" / "All experiments"
  4. A scrollable list of experiment cards
  5. A footer with "Reset all" and "Share state" buttons

### Experiment card

Each experiment card shows:

- Experiment name
- Experiment ID (subtle, monospace)
- Current variant (highlighted)
- Assignment reason ("by targeting", "by manual override", "by default")
- Tap to expand: list of all variants with a radio picker
- Each variant row shows: label, description, "set active" button
- An overflow menu: "Copy ID", "Reset to default", "Share state"

### Search

- Case-insensitive, substring match on ID + name + label
- Debounced 100 ms
- Highlights matches in the list

### Empty state

When no experiments match the current route:

> No experiments on this route.
> Toggle "All experiments" above to see the full list.

---

## Production safety

The overlay is a dev-only tool. In production, mounting it is a bug. We make it hard to do accidentally.

### Auto-disable in production

The overlay component checks multiple signals before rendering:

```tsx
function VariantDebugOverlay({ forceEnable = false }) {
  const isDev =
    forceEnable ||
    (typeof __DEV__ !== "undefined" && __DEV__) ||
    process.env.NODE_ENV === "development";

  if (!isDev) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[variantlab] VariantDebugOverlay rendered in production. " +
          "Use forceEnable={true} if this is intentional.",
      );
    }
    return null;
  }

  return <OverlayImpl />;
}
```

### Tree-shaking in production builds

The overlay implementation is exported from a separate entry point:

```ts
// @variantlab/react-native/debug
export { VariantDebugOverlay } from "./overlay.js";
```

If the user doesn't import from `/debug`, the overlay code is not bundled. This keeps production bundles clean even if a developer forgets to wrap in `__DEV__`.

### Never log user data

The overlay uses the same storage as the engine and respects the same privacy rules:

- No telemetry
- No remote logging
- No external network calls
- All state is local

### Rate-limited actions

Rapid-fire variant switching is rate-limited to 5 changes/second to prevent accidental state thrashing or runaway loops.

---

## Activation modes

### Tap (default)

Tap the floating button to open.

### Shake gesture (opt-in)

```tsx
<VariantDebugOverlay
  activation={{ shake: true, shakeThreshold: 15 }}
/>
```

Uses device motion to detect a shake. Threshold configurable. On React Native, uses `react-native`'s `DeviceEventEmitter` (Android) or a lightweight motion sensor abstraction. On web, uses `DeviceMotionEvent` (requires user permission on iOS).

### Secret gesture

Advanced: a 4-corner tap sequence in a specific order. Useful for hiding the overlay until QA knows the gesture.

### Keyboard shortcut (web only)

`Ctrl+Shift+V` toggles the overlay on web builds.

### URL parameter (web only)

Append `?__variantlab=1` to the URL to force-enable the overlay even in production (requires `forceEnable` on the component).

---

## Information architecture

### The "Overview" tab (default)

Shows experiments matching the current route, grouped by:

- **Active** — experiments this user is enrolled in
- **Targeted but not enrolled** — experiments the user matches but was excluded by weights
- **Not targeted** — experiments that exist but don't match this user's context

### The "History" tab

Time-travel inspector. See [`time-travel.md`](./time-travel.md).

### The "Context" tab

Shows the current `VariantContext`:

- Platform, app version, locale
- Screen size bucket
- Route
- User ID (masked)
- Attributes (JSON tree view)

### The "Config" tab

Shows the loaded config:

- Version
- Source (bundled / remote / file)
- Last fetched
- Signature status (valid / invalid / none)
- Total experiments count

### The "Events" tab

Live-tailing telemetry stream (if configured):

- Every `assignment`, `exposure`, `variantChanged`, `rollback` event
- Timestamp, experiment, variant, reason
- Can be paused and exported as JSON

---

## Customization

Users can customize the overlay extensively:

```tsx
<VariantDebugOverlay
  position="bottom-right"
  offset={{ x: 20, y: 80 }}
  theme="dark"
  activation={{ tap: true, shake: true, shortcut: "mod+shift+v" }}
  tabs={["overview", "history", "context", "config", "events"]}
  showBadge
  locked={false}
  onOpen={() => console.log("overlay opened")}
  onClose={() => console.log("overlay closed")}
  onVariantChange={(exp, variant) => console.log(exp, variant)}
  renderButton={(props) => <CustomButton {...props} />}
/>
```

### Custom button render

Users who want a non-floating button can render their own trigger:

```tsx
<VariantDebugOverlay renderButton={() => null} ref={overlayRef} />

<Button onPress={() => overlayRef.current?.open()}>
  Open debug
</Button>
```

### Custom theme

The overlay respects the app's dark/light theme by default, but users can override:

```tsx
<VariantDebugOverlay
  theme={{
    background: "#1a1a1a",
    foreground: "#ffffff",
    accent: "#8b5cf6",
    border: "#333",
  }}
/>
```

---

## Accessibility

### Screen readers

- The floating button has `accessibilityLabel="Open variantlab debug overlay"`
- Each experiment card announces: "Experiment {name}, current variant {variant}, double tap to expand"
- Variant radios use native radio semantics
- Focus is trapped inside the sheet when open
- ESC closes the sheet (web)

### Keyboard navigation (web)

- `Tab` cycles focus through controls
- `Enter` / `Space` activates buttons
- Arrow keys move between variant rows
- `ESC` closes the overlay

### Reduced motion

If the user has `prefers-reduced-motion`, the slide animation is replaced with a fade.

### Contrast

All text meets WCAG AA contrast against the overlay background in both light and dark themes.

---

## Performance

- The overlay lazy-loads its tab implementations
- The experiment list is virtualized when > 50 experiments
- The search input is debounced
- No re-renders on unrelated state changes (isolated subscription)

---

## Dependencies

- Core: `@variantlab/core`
- React Native: no extra deps beyond React Native itself
- Web: no extra deps beyond React
- No animation library (hand-rolled with Animated API / CSS transitions)
- No bottom-sheet library (hand-rolled modal)
- No icon library (inline SVGs)

This keeps the overlay < 4 KB gzipped even with all features.

---

## Integration with other features

- **Route scoping** ([`targeting.md`](./targeting.md#routes)): the overlay filters by `useRouteExperiments`
- **Time travel** ([`time-travel.md`](./time-travel.md)): the history tab
- **QR sharing** ([`qr-sharing.md`](./qr-sharing.md)): the "Share state" button generates a QR
- **Crash rollback** ([`crash-rollback.md`](./crash-rollback.md)): rollback events show in the events tab
- **Codegen** ([`codegen.md`](./codegen.md)): overlay shows variant labels from the generated types

---

## See also

- [`API.md`](../../API.md) — `VariantDebugOverlay` props
- [`origin-story.md`](../research/origin-story.md) — why this feature exists
