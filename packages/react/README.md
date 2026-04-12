# @variantlab/react

> React hooks and components for variantlab — the universal, zero-dependency A/B testing toolkit.

![npm version](https://img.shields.io/npm/v/@variantlab/react?label=npm&color=blue)
![bundle size](https://img.shields.io/badge/gzip-%3C2KB-brightgreen)

## Install

```bash
npm install @variantlab/core @variantlab/react
```

**Peer dependencies:** `react ^18.2.0 || ^19.0.0`

---

## Complete example

### `experiments.json`

```json
{
  "version": 1,
  "experiments": [
    {
      "id": "hero-layout",
      "name": "Hero section layout",
      "type": "render",
      "default": "centered",
      "variants": [
        { "id": "centered" },
        { "id": "split" }
      ]
    },
    {
      "id": "cta-copy",
      "name": "CTA button text",
      "type": "value",
      "default": "buy-now",
      "variants": [
        { "id": "buy-now", "value": "Buy now" },
        { "id": "get-started", "value": "Get started" },
        { "id": "try-free", "value": "Try it free" }
      ]
    },
    {
      "id": "pricing",
      "name": "Pricing tier",
      "type": "value",
      "default": "low",
      "assignment": { "strategy": "sticky-hash" },
      "variants": [
        { "id": "low", "value": 9.99, "weight": 50 },
        { "id": "high", "value": 14.99, "weight": 50 }
      ]
    }
  ]
}
```

### `App.tsx`

```tsx
import { createEngine } from "@variantlab/core";
import { VariantLabProvider } from "@variantlab/react";
import experiments from "./experiments.json";

const engine = createEngine(experiments, {
  context: {
    userId: "user-123",
    platform: "web",
    locale: "en",
  },
});

export default function App() {
  return (
    <VariantLabProvider engine={engine}>
      <HomePage />
    </VariantLabProvider>
  );
}
```

### `HomePage.tsx`

```tsx
import { useVariant, useVariantValue, Variant, VariantErrorBoundary } from "@variantlab/react";

function HomePage() {
  return (
    <main>
      <VariantErrorBoundary experimentId="hero-layout" fallback={<p>Error loading hero</p>}>
        <HeroSection />
      </VariantErrorBoundary>
      <CheckoutButton />
      <PricingDisplay />
    </main>
  );
}

function HeroSection() {
  return (
    <Variant experimentId="hero-layout" fallback={<CenteredHero />}>
      {{
        centered: <CenteredHero />,
        split: <SplitHero />,
      }}
    </Variant>
  );
}

function CheckoutButton() {
  const copy = useVariantValue<string>("cta-copy");
  return <button>{copy}</button>;
}

function PricingDisplay() {
  const price = useVariantValue<number>("pricing");
  return <span>${price}/month</span>;
}
```

---

## Hooks

### `useVariant(experimentId)` — get the active variant ID

Use this for **render experiments** where you switch between different components or layouts.

```tsx
import { useVariant } from "@variantlab/react";

function HeroSection() {
  const layout = useVariant("hero-layout");
  // Returns: "centered" | "split"

  if (layout === "split") {
    return <SplitHero />;
  }
  return <CenteredHero />;
}
```

### `useVariantValue<T>(experimentId)` — get the experiment value

Use this for **value experiments** where variants carry data (strings, numbers, booleans, objects).

```tsx
import { useVariantValue } from "@variantlab/react";

function CheckoutButton() {
  const buttonText = useVariantValue<string>("cta-copy");
  // Returns: "Buy now" | "Get started" | "Try it free"
  return <button>{buttonText}</button>;
}

function PricingDisplay() {
  const price = useVariantValue<number>("pricing");
  // Returns: 9.99 | 14.99
  return <span>${price}/month</span>;
}
```

### `useExperiment(experimentId)` — get full experiment state

Returns the variant ID, experiment config, and whether it's been manually overridden. Useful for debug UIs or analytics.

```tsx
import { useExperiment } from "@variantlab/react";

function ExperimentInfo() {
  const { variantId, experiment, isOverridden } = useExperiment("hero-layout");

  return (
    <div>
      <p>Experiment: {experiment.name}</p>
      <p>Current variant: {variantId}</p>
      {isOverridden && <p style={{ color: "orange" }}>⚠ Manually overridden</p>}
    </div>
  );
}
```

### `useSetVariant()` — override a variant

Returns a function to force-assign a variant. Useful for building debug UIs, admin panels, or testing during development.

```tsx
import { useSetVariant, useVariant } from "@variantlab/react";

function VariantPicker() {
  const setVariant = useSetVariant();
  const current = useVariant("hero-layout");

  return (
    <div>
      <p>Current: {current}</p>
      <button onClick={() => setVariant("hero-layout", "centered")}>Centered</button>
      <button onClick={() => setVariant("hero-layout", "split")}>Split</button>
    </div>
  );
}
```

### `useVariantLabEngine()` — access the engine directly

Returns the raw engine instance for advanced operations like resetting all overrides, updating context, or subscribing to changes.

```tsx
import { useVariantLabEngine } from "@variantlab/react";

function SettingsPanel() {
  const engine = useVariantLabEngine();

  return (
    <div>
      <button onClick={() => engine.resetAll()}>Reset all experiments</button>
      <button onClick={() => engine.updateContext({ locale: "bn" })}>
        Switch to Bengali
      </button>
    </div>
  );
}
```

### `useRouteExperiments()` — get experiments targeting the current route

Returns only experiments whose targeting rules match the current URL path. Useful for showing relevant experiments in a debug panel.

```tsx
import { useRouteExperiments } from "@variantlab/react";

function RouteDebugPanel() {
  const experiments = useRouteExperiments();

  return (
    <ul>
      {experiments.map((exp) => (
        <li key={exp.id}>{exp.name}: {exp.variantId}</li>
      ))}
    </ul>
  );
}
```

---

## Components

### `<Variant>` — render-swap by variant ID

Renders the child matching the active variant. Cleaner than if/switch when you have distinct JSX per variant.

```tsx
import { Variant } from "@variantlab/react";

function OnboardingPage() {
  return (
    <Variant experimentId="onboarding-flow" fallback={<ClassicOnboarding />}>
      {{
        classic: <ClassicOnboarding />,
        "quick-start": <QuickStartOnboarding />,
        guided: <GuidedOnboarding />,
      }}
    </Variant>
  );
}
```

### `<VariantValue>` — render-prop for value experiments

Passes the experiment value to a render function. Useful when you want to keep the value inline.

```tsx
import { VariantValue } from "@variantlab/react";

function WelcomeBanner() {
  return (
    <VariantValue experimentId="cta-copy">
      {(value) => <h2>{value}</h2>}
    </VariantValue>
  );
}
```

### `<VariantErrorBoundary>` — crash-safe experiments

Wraps an experiment in an error boundary. If a variant crashes N times within a time window, the engine automatically rolls back to the default variant.

```tsx
import { VariantErrorBoundary } from "@variantlab/react";

function SafeHeroSection() {
  return (
    <VariantErrorBoundary
      experimentId="hero-layout"
      fallback={<p>Something went wrong. Showing default layout.</p>}
    >
      <HeroSection />
    </VariantErrorBoundary>
  );
}
```

### `<VariantLabProvider>` — context provider

Wraps your app and provides the engine to all hooks and components. Must be near the top of your component tree.

```tsx
import { VariantLabProvider } from "@variantlab/react";

export default function App() {
  return (
    <VariantLabProvider engine={engine}>
      {/* All useVariant/useVariantValue/etc. hooks work inside here */}
      <Router />
    </VariantLabProvider>
  );
}
```

---

## Debug overlay

A floating button that opens a side panel for viewing and overriding experiments during development. Only included when you import from `@variantlab/react/debug` — production bundles are never affected.

```tsx
import { VariantDebugOverlay } from "@variantlab/react/debug";

export default function App() {
  return (
    <VariantLabProvider engine={engine}>
      <Router />
      {process.env.NODE_ENV === "development" && <VariantDebugOverlay />}
    </VariantLabProvider>
  );
}
```

What the overlay shows:
- All active experiments with their current variant
- Click any experiment to expand and switch variants
- Search/filter experiments by name or ID
- Current targeting context (userId, platform, locale, etc.)
- Full config summary (version, experiment count, kill-switch state)
- Event history (assignments, changes, rollbacks, errors)

### Customization

```tsx
// Change the floating button position
<VariantDebugOverlay position="bottom-left" />

// Hide the floating button (open programmatically instead)
<VariantDebugOverlay hideButton />

// Custom theme colors
<VariantDebugOverlay theme={{ accent: "#a78bfa" }} />

// Hide the overlay
<VariantDebugOverlay enabled={false} />
```

### Programmatic control

```ts
import { openDebugOverlay, closeDebugOverlay } from "@variantlab/react/debug";

// Open from a keyboard shortcut
document.addEventListener("keydown", (e) => {
  if (e.key === "F12" && e.shiftKey) openDebugOverlay();
});
```

---

## Type safety with codegen

Generate TypeScript types from your config so typos become compile errors:

```bash
npx @variantlab/cli generate
```

After running, `useVariant("hero-layout")` returns `"centered" | "split"` as a literal union type. Passing a non-existent experiment ID like `useVariant("typo")` is a compile error.

---

## License

[MIT](./LICENSE)
