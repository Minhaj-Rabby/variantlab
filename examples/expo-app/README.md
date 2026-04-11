# variantlab · Expo example

A minimal Expo + React Native example showing how to wire
`@variantlab/react-native` into a real app.

## What it demonstrates

- Loading a config from a bundled `experiments.json` and constructing
  a `VariantEngine` at module scope (so hot reloads don't re-bucket
  the user).
- Wrapping the tree in `<VariantLabProvider>` so every `useVariant`
  call downstream resolves against the same engine instance.
- A three-way layout experiment (`card-layout`) with a
  Drishtikon-style home screen — `stacked`, `grid`, `split` — wired up
  via the `<Variant>` render-prop component.
- A value experiment (`cta-copy`) consumed via `useVariantValue`.
- A second value experiment (`price-badge`) for the little yellow
  chip above the hero.
- An imperative `setVariant` button that cycles the layout variant
  from code — no overlay required.
- The `<VariantDebugOverlay />` from `@variantlab/react-native/debug`
  mounted on top of the tree. Tap the flask icon in the bottom-right
  corner to inspect and override assignments on-device. The overlay
  lives in a **separate entrypoint** so it is tree-shaken out of
  production bundles that never import it.

## Files

```
examples/expo-app/
├── App.tsx              # root; creates engine, mounts provider + overlay
├── experiments.json     # 3 experiments (card-layout, cta-copy, price-badge)
├── src/
│   ├── HomeScreen.tsx   # showcases useVariant / useVariantValue / useSetVariant
│   └── HeroCard.tsx     # three visual variants of the hero
├── tsconfig.json
└── package.json
```

## Running it

This example targets Expo SDK 51+ / React Native 0.76+. Like the
other `examples/*` packages, it is a workspace member so you do not
need to `npm install` — `pnpm` at the repo root resolves the
`@variantlab/*` workspace dependencies automatically.

```sh
# from the repo root
pnpm install

# typecheck just this example
pnpm --filter expo-app-example typecheck
```

To actually run it on a device/simulator you'll need Expo's CLI.
That's intentionally outside the scope of the docs-first example
(same as `examples/react-vite` — we just ship the source and let the
host project pick its dev server).

## How to try the debug overlay

1. Launch the app.
2. Tap the flask icon in the bottom-right corner. A bottom sheet
   slides up with four tabs: Overview, Context, Config, History.
3. In **Overview**, tap the `card-layout` row and pick a different
   variant. The home screen re-renders instantly.
4. In **Context**, you'll see the engine-wide context (`userId`,
   `platform`, `appVersion`) — `userId` is masked for privacy.
5. The **History** tab shows a scrollable log of every `assignment`,
   `variantChanged`, and `contextUpdated` event the engine has
   emitted since launch.

See `packages/react-native/README.md` for the full API reference.
