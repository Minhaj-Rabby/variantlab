# @variantlab/react-native

## 0.1.0

### Minor Changes

- Initial alpha release — see ROADMAP.md phase 1 for scope.

  Core engine with config validation, targeting evaluator (semver, glob, platform, locale, screen size, routes, userId, attributes), assignment strategies (default, random, sticky-hash, weighted, mutex), history ring buffer, kill switch, time gate, and crash rollback.

  React adapter with hooks (useVariant, useVariantValue, useExperiment, useSetVariant, useVariantLabEngine, useRouteExperiments) and components (Variant, VariantValue, VariantErrorBoundary).

  React Native adapter with storage adapters (AsyncStorage, MMKV, SecureStore, memory), deep link handling, auto-context detection, and debug overlay with bottom sheet UI.

  Next.js adapter with SSR support, cookie-based sticky assignment, edge-compatible middleware, and App Router / Pages Router helpers.

  CLI with init, generate (codegen), validate, and eval commands. Zero runtime dependencies.

### Patch Changes

- Updated dependencies
  - @variantlab/core@0.1.0
  - @variantlab/react@0.1.0
