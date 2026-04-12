# @variantlab/cli

> Command-line tool for variantlab — scaffold, generate types, validate configs, and evaluate experiments.

![npm version](https://img.shields.io/npm/v/@variantlab/cli?label=npm&color=blue)

## Install

```bash
# Use via npx (no install needed)
npx @variantlab/cli init

# Or install globally
npm install -g @variantlab/cli
```

## Commands

### `variantlab init`

Scaffold an `experiments.json` file with starter experiments.

```bash
variantlab init           # Creates experiments.json
variantlab init --force   # Overwrite existing file
```

### `variantlab generate`

Generate TypeScript types from your `experiments.json`. Experiment IDs and variant IDs become literal types — typos become compile errors.

```bash
variantlab generate                          # Default: reads experiments.json, writes variantlab.d.ts
variantlab generate --config ./config.json   # Custom config path
variantlab generate --out ./types/vl.d.ts    # Custom output path
variantlab generate --watch                  # Regenerate on file changes
```

The generated `.d.ts` file provides:
- `VariantLabExperiments` interface with all experiment IDs
- `ExperimentId` union type
- `VariantId<E>` mapped type per experiment
- `VariantValueType<E>` for value experiments
- Module augmentation for type-safe hooks

### `variantlab validate`

Validate an experiments config file against the schema.

```bash
variantlab validate                    # Validates ./experiments.json
variantlab validate ./custom-path.json # Validate a specific file
```

Reports:
- JSON parse errors
- Schema violations (missing fields, wrong types)
- Duplicate experiment IDs
- Invalid default variant references
- Invalid targeting predicates

### `variantlab eval`

Evaluate an experiment against a targeting context — useful for debugging why a user gets a specific variant.

```bash
# Inline context
variantlab eval --experiment hero-layout --context '{"platform":"ios","screenSize":"small"}'

# Context from file
variantlab eval --experiment hero-layout --context-file ./test-context.json

# Custom config path
variantlab eval ./config.json --experiment hero-layout --context '{"userId":"user-123"}'
```

Shows:
- Step-by-step targeting trace (pass/fail per field)
- Final resolved variant
- Assignment strategy used

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | File not found |
| 2 | Validation error / invalid config |
| 3 | I/O error |
| 4 | Invalid arguments |

## Visual debugging

The CLI's `eval` command is the terminal equivalent of the debug overlay available in the UI packages. For a visual, interactive debug experience, see:

- **React**: `import { VariantDebugOverlay } from "@variantlab/react/debug"`
- **Next.js**: `import { VariantDebugOverlay } from "@variantlab/next/debug"`
- **React Native**: `import { VariantDebugOverlay } from "@variantlab/react-native/debug"`

## Global options

```
--help      Show help for any command
--version   Show version
--verbose   Enable verbose output
```

## Programmatic API

All commands are also available as functions:

```ts
import { init, generate, validate, evalCommand } from "@variantlab/cli";

await init({ force: true });
await generate({ config: "./experiments.json", out: "./variantlab.d.ts" });
await validate("./experiments.json");
await evalCommand("./experiments.json", {
  experiment: "hero-layout",
  context: '{"platform":"ios"}',
});
```

## License

[MIT](./LICENSE)
