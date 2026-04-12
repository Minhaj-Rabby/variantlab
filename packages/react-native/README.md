# @variantlab/react-native

> React Native and Expo bindings for variantlab — storage adapters, auto-context, deep links, debug overlay, and QR sharing.

![npm version](https://img.shields.io/npm/v/@variantlab/react-native/alpha?label=npm&color=blue)
![bundle size](https://img.shields.io/badge/gzip-%3C4KB-brightgreen)

## Install

```bash
npm install @variantlab/core@alpha @variantlab/react@alpha @variantlab/react-native@alpha
```

**Peer dependencies (required):**
- `react ^18.2.0 || ^19.0.0`
- `react-native >=0.74.0`

**Optional peer dependencies (install what you need):**
- `@react-native-async-storage/async-storage` — persistent storage
- `react-native-mmkv` — fast key-value storage
- `expo-secure-store` — encrypted storage
- `expo-localization` — locale detection
- `react-native-safe-area-context` — safe area for debug overlay
- `react-native-svg` — QR code rendering

---

## Complete example

Here's a full working setup — from config to rendering variants:

### `experiments.json`

```json
{
  "version": 1,
  "experiments": [
    {
      "id": "card-layout",
      "name": "Card layout experiment",
      "type": "render",
      "default": "standard",
      "variants": [
        { "id": "standard" },
        { "id": "compact" },
        { "id": "pip-thumbnail" }
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
      "id": "onboarding-flow",
      "name": "Onboarding flow",
      "type": "render",
      "default": "classic",
      "assignment": { "strategy": "sticky-hash" },
      "variants": [
        { "id": "classic" },
        { "id": "quick-start" }
      ]
    }
  ]
}
```

### `variantlab.ts` — engine setup

```ts
import { createEngine } from "@variantlab/core";
import { getAutoContext, createAsyncStorageAdapter } from "@variantlab/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import experiments from "./experiments.json";

export const engine = createEngine(experiments, {
  context: {
    ...getAutoContext(), // auto-detects platform, screenSize, locale
    userId: "user-123", // your authenticated user ID
  },
  storage: createAsyncStorageAdapter(AsyncStorage),
});
```

### `app/_layout.tsx` — wrap your app

```tsx
import { VariantLabProvider } from "@variantlab/react-native";
import { VariantDebugOverlay } from "@variantlab/react-native/debug";
import { engine } from "./variantlab";

export default function RootLayout() {
  return (
    <VariantLabProvider engine={engine}>
      <Slot />
      {__DEV__ && <VariantDebugOverlay />}
    </VariantLabProvider>
  );
}
```

---

## Hooks

### `useVariant(experimentId)` — get the active variant ID

Use this for **render experiments** where you switch between different components.

```tsx
import { View } from "react-native";
import { useVariant } from "@variantlab/react-native";

function CardSection() {
  const layout = useVariant("card-layout");
  // Returns: "standard" | "compact" | "pip-thumbnail"

  switch (layout) {
    case "compact":
      return <CompactCard />;
    case "pip-thumbnail":
      return <PipThumbnailCard />;
    default:
      return <StandardCard />;
  }
}
```

### `useVariantValue<T>(experimentId)` — get the experiment value

Use this for **value experiments** where variants carry data (strings, numbers, objects).

```tsx
import { Text, TouchableOpacity } from "react-native";
import { useVariantValue } from "@variantlab/react-native";

function CheckoutButton() {
  const buttonText = useVariantValue<string>("cta-copy");
  // Returns: "Buy now" | "Get started" | "Try it free"

  return (
    <TouchableOpacity style={styles.button}>
      <Text>{buttonText}</Text>
    </TouchableOpacity>
  );
}

function PricingDisplay() {
  const price = useVariantValue<number>("pricing-tier");
  // Returns: 9.99 | 14.99 | 19.99

  return <Text>${price}/month</Text>;
}
```

### `useExperiment(experimentId)` — get full experiment state

Returns the variant ID, the experiment config, and whether it's been manually overridden.

```tsx
import { Text, View } from "react-native";
import { useExperiment } from "@variantlab/react-native";

function DebugBanner() {
  const { variantId, experiment, isOverridden } = useExperiment("card-layout");

  return (
    <View>
      <Text>Experiment: {experiment.name}</Text>
      <Text>Active variant: {variantId}</Text>
      {isOverridden && <Text style={{ color: "orange" }}>⚠ Manually overridden</Text>}
    </View>
  );
}
```

### `useSetVariant()` — override a variant (for testing/QA)

Returns a function to force-assign a variant. Useful for building your own debug UI or testing different variants during development.

```tsx
import { Button, View } from "react-native";
import { useSetVariant, useVariant } from "@variantlab/react-native";

function VariantPicker() {
  const setVariant = useSetVariant();
  const current = useVariant("card-layout");

  return (
    <View>
      <Text>Current: {current}</Text>
      <Button title="Standard" onPress={() => setVariant("card-layout", "standard")} />
      <Button title="Compact" onPress={() => setVariant("card-layout", "compact")} />
      <Button title="PiP" onPress={() => setVariant("card-layout", "pip-thumbnail")} />
    </View>
  );
}
```

### `useVariantLabEngine()` — access the engine directly

Returns the engine instance for advanced operations like resetting all overrides or updating context.

```tsx
import { Button } from "react-native";
import { useVariantLabEngine } from "@variantlab/react-native";

function ResetButton() {
  const engine = useVariantLabEngine();

  return (
    <Button
      title="Reset all experiments"
      onPress={() => engine.resetAll()}
    />
  );
}

function ContextUpdater() {
  const engine = useVariantLabEngine();

  const onLogin = (userId: string) => {
    engine.updateContext({ userId });
  };

  // ...
}
```

### `useRouteExperiments()` — get experiments targeting the current route

Returns only the experiments whose targeting rules match the current route (useful with Expo Router).

```tsx
import { Text, FlatList } from "react-native";
import { useRouteExperiments } from "@variantlab/react-native";

function RouteExperimentsList() {
  const experiments = useRouteExperiments();

  return (
    <FlatList
      data={experiments}
      renderItem={({ item }) => (
        <Text>{item.name}: {item.variantId}</Text>
      )}
    />
  );
}
```

---

## Components

### `<Variant>` — render-swap by variant ID

Renders the child matching the active variant. Cleaner than a switch statement when you have distinct JSX per variant.

```tsx
import { Variant } from "@variantlab/react-native";

function OnboardingScreen() {
  return (
    <Variant experimentId="onboarding-flow" fallback={<ClassicOnboarding />}>
      {{
        classic: <ClassicOnboarding />,
        "quick-start": <QuickStartOnboarding />,
      }}
    </Variant>
  );
}
```

### `<VariantValue>` — render-prop for value experiments

Passes the experiment value to a render function.

```tsx
import { Text } from "react-native";
import { VariantValue } from "@variantlab/react-native";

function WelcomeBanner() {
  return (
    <VariantValue experimentId="welcome-message">
      {(message) => <Text style={styles.banner}>{message}</Text>}
    </VariantValue>
  );
}
```

### `<VariantErrorBoundary>` — crash-safe experiments

Wraps an experiment in an error boundary. If a variant crashes repeatedly, the engine auto-rolls back to the default variant and renders the fallback.

```tsx
import { Text } from "react-native";
import { VariantErrorBoundary } from "@variantlab/react-native";

function SafeCardSection() {
  return (
    <VariantErrorBoundary
      experimentId="card-layout"
      fallback={<Text>Something went wrong. Showing default layout.</Text>}
    >
      <CardSection />
    </VariantErrorBoundary>
  );
}
```

### `<VariantLabProvider>` — context provider

Wraps your app and provides the engine to all hooks and components. Must be at the top of your component tree.

```tsx
import { VariantLabProvider } from "@variantlab/react-native";
import { engine } from "./variantlab";

export default function App() {
  return (
    <VariantLabProvider engine={engine}>
      {/* All hooks and components work inside here */}
      <Navigation />
    </VariantLabProvider>
  );
}
```

---

## Auto-context detection

`getAutoContext()` reads device info automatically so your targeting rules just work:

| Field | Source | Example |
|-------|--------|---------|
| `platform` | `Platform.OS` | `"ios"`, `"android"`, `"web"` |
| `screenSize` | `Dimensions.get("window").width` | `"small"` (<375), `"medium"` (375-767), `"large"` (768+) |
| `locale` | `expo-localization` or `NativeModules` | `"en"`, `"bn"`, `"fr"` |
| `appVersion` | `expo-constants` or `DeviceInfo` | `"2.1.0"` |

```tsx
import { getAutoContext } from "@variantlab/react-native";

const context = getAutoContext();
// { platform: "ios", screenSize: "medium", locale: "en", appVersion: "2.1.0" }
```

You can merge it with your own context:

```ts
const engine = createEngine(experiments, {
  context: {
    ...getAutoContext(),
    userId: "user-123",
    attributes: { plan: "pro", country: "BD" },
  },
});
```

---

## Storage adapters

Persist variant assignments across app restarts. Pick the one that fits your stack:

### AsyncStorage (most common)

```tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStorageAdapter } from "@variantlab/react-native";

const storage = createAsyncStorageAdapter(AsyncStorage);
```

### MMKV (fastest — synchronous reads)

```tsx
import { MMKV } from "react-native-mmkv";
import { createMMKVStorageAdapter } from "@variantlab/react-native";

const mmkv = new MMKV();
const storage = createMMKVStorageAdapter(mmkv);
```

### SecureStore (encrypted — for sensitive data)

```tsx
import * as SecureStore from "expo-secure-store";
import { createSecureStoreAdapter } from "@variantlab/react-native";

const storage = createSecureStoreAdapter(SecureStore);
```

### Memory (no persistence — for tests)

```tsx
import { createMemoryStorage } from "@variantlab/react-native";

const storage = createMemoryStorage();
```

Pass the storage to your engine:

```ts
const engine = createEngine(experiments, {
  context: getAutoContext(),
  storage, // variant assignments persist here
});
```

---

## Debug overlay

A floating button that opens a bottom-sheet for viewing and overriding experiments on device. Only use in development.

```tsx
import { VariantDebugOverlay } from "@variantlab/react-native/debug";

export default function App() {
  return (
    <VariantLabProvider engine={engine}>
      <YourApp />
      {__DEV__ && <VariantDebugOverlay />}
    </VariantLabProvider>
  );
}
```

What the overlay shows:
- All active experiments with their current variant
- Tap any experiment to switch variants
- Current targeting context (platform, screenSize, locale, etc.)
- Assignment source for each experiment (default, sticky-hash, override, etc.)
- Search/filter experiments

Customize the trigger position:

```tsx
<VariantDebugOverlay corner="bottom-left" />
```

---

## Deep link overrides

Let your QA team force variants by opening a URL:

```
myapp://variantlab?set=card-layout:compact
```

### Setup

```tsx
import { registerDeepLinkHandler } from "@variantlab/react-native";
import { engine } from "./variantlab";

// Call once during app initialization
registerDeepLinkHandler(engine);
```

Now opening `myapp://variantlab?set=card-layout:compact` will force the `card-layout` experiment to the `compact` variant.

---

## QR sharing

Share your current experiment state with teammates — they scan the QR and get the exact same variants.

```tsx
import { buildQrUrl, parseQrUrl } from "@variantlab/react-native/qr";
import { encodeSharePayload, decodeSharePayload } from "@variantlab/react-native";

// Build a shareable URL from current assignments
const payload = encodeSharePayload({
  v: 1,
  u: "user-123",
  a: { "card-layout": "compact", "cta-copy": "try-free" },
});
const url = buildQrUrl(payload);
// "variantlab://apply?p=..."

// Parse a received QR URL
const result = parseQrUrl(scannedUrl);
if (result.ok) {
  // Apply the assignments to the engine
  applyPayload(engine, result.payload);
}
```

---

## Codegen (type safety)

Generate TypeScript types so experiment IDs and variant IDs are checked at compile time:

```bash
npx @variantlab/cli@alpha generate
```

After codegen, `useVariant("card-layout")` returns `"standard" | "compact" | "pip-thumbnail"` as a literal type. Typos become compile errors.

---

## License

[MIT](./LICENSE)
