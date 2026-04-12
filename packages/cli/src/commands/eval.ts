import { resolve } from "node:path";
import {
  ConfigValidationError,
  createEngine,
  type ExperimentsConfig,
  explain,
  type VariantContext,
  validateConfig,
} from "@variantlab/core";
import { fileExists, readTextFile } from "../utils/file.js";
import * as print from "../utils/printer.js";
import { color } from "../utils/printer.js";

export interface EvalOptions {
  readonly experiment?: string | undefined;
  readonly context?: string | undefined;
  readonly contextFile?: string | undefined;
  readonly verbose?: boolean | undefined;
}

export async function evalCommand(
  configPathArg?: string,
  options: EvalOptions = {},
): Promise<number> {
  const configPath = resolve(configPathArg ?? "experiments.json");

  if (!options.experiment) {
    print.error("Missing required flag: --experiment <id>");
    return 4;
  }

  if (!(await fileExists(configPath))) {
    print.error(`Config not found: ${configPath}`);
    return 1;
  }

  // Load config
  let config: ExperimentsConfig;
  try {
    const raw = await readTextFile(configPath);
    const parsed = JSON.parse(raw);
    config = validateConfig(parsed);
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      print.error(`Invalid config: ${err.issues.length} issue(s)`);
      return 2;
    }
    print.error(`Failed to load config: ${(err as Error).message}`);
    return err instanceof SyntaxError ? 2 : 3;
  }

  // Load context
  let context: VariantContext = {};
  if (options.contextFile) {
    try {
      const raw = await readTextFile(resolve(options.contextFile));
      context = JSON.parse(raw) as VariantContext;
    } catch (err) {
      print.error(`Failed to load context file: ${(err as Error).message}`);
      return 3;
    }
  } else if (options.context) {
    try {
      context = JSON.parse(options.context) as VariantContext;
    } catch (err) {
      print.error(`Invalid context JSON: ${(err as Error).message}`);
      return 4;
    }
  }

  // Find experiment
  const experiment = config.experiments.find((e) => e.id === options.experiment);
  if (!experiment) {
    print.error(`Experiment not found: ${options.experiment}`);
    const ids = config.experiments.map((e) => e.id);
    if (ids.length > 0) {
      print.info(`Available experiments: ${ids.join(", ")}`);
    }
    return 4;
  }

  // Targeting trace
  console.log(color.bold(`Experiment: ${experiment.id}`));
  console.log(`  Name: ${experiment.name}`);
  console.log(`  Type: ${experiment.type ?? "render"}`);
  console.log(`  Assignment: ${experiment.assignment ?? "default"}`);
  console.log(`  Default: ${experiment.default}`);
  console.log(`  Variants: ${experiment.variants.map((v) => v.id).join(", ")}`);
  console.log("");

  console.log(color.bold("Context:"));
  if (Object.keys(context).length === 0) {
    console.log("  (empty)");
  } else {
    for (const [key, val] of Object.entries(context)) {
      console.log(`  ${key}: ${JSON.stringify(val)}`);
    }
  }
  console.log("");

  // Explain targeting
  console.log(color.bold("Targeting trace:"));
  const result = explain(experiment, context);
  if (result.steps.length === 0) {
    console.log("  (no targeting rules)");
  } else {
    for (const step of result.steps) {
      const icon = step.matched ? color.green("PASS") : color.red("FAIL");
      const detail = step.detail ? ` — ${step.detail}` : "";
      console.log(`  ${icon} ${step.field}${detail}`);
    }
  }
  console.log("");

  // Resolve variant
  const engine = createEngine(config, { context });
  const variantId = engine.getVariant(experiment.id);
  const variant = experiment.variants.find((v) => v.id === variantId);

  console.log(color.bold("Result:"));
  console.log(`  Targeted: ${result.matched ? color.green("yes") : color.red("no")}`);
  console.log(`  Variant: ${color.cyan(variantId)}`);
  if (variant?.value !== undefined) {
    console.log(`  Value: ${JSON.stringify(variant.value)}`);
  }
  if (!result.matched && result.reason) {
    console.log(`  Reason: failed on ${color.yellow(result.reason)}`);
  }
  console.log("");

  engine.dispose();
  return 0;
}
