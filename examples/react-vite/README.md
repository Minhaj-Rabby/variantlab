# react-vite-example

Minimal Vite + React + TypeScript app demonstrating `@variantlab/react`.

## Run it

From the monorepo root:

```bash
pnpm --filter react-vite-example dev
```

Then open http://localhost:5173.

## What it shows

1. **`useVariant`** — read which variant is active and branch the UI.
2. **`<Variant>`** — render-prop component swap for "render" experiments.
3. **`useVariantValue`** — read a typed primitive value for "value"
   experiments.
4. **`useSetVariant`** — dev-only imperative setter (wired to buttons here).

The config lives in `experiments.json` at the example root. Edit it and
reload the page to see new variants flow through.
