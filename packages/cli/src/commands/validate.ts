import { resolve } from "node:path";
import { ConfigValidationError, validateConfig } from "@variantlab/core";
import { fileExists, readTextFile } from "../utils/file.js";
import * as print from "../utils/printer.js";
import { color } from "../utils/printer.js";

export interface ValidateOptions {
  readonly verbose?: boolean | undefined;
}

export async function validate(
  configPathArg?: string,
  options: ValidateOptions = {},
): Promise<number> {
  const configPath = resolve(configPathArg ?? "experiments.json");

  if (!(await fileExists(configPath))) {
    print.error(`Config not found: ${configPath}`);
    return 1;
  }

  let raw: string;
  try {
    raw = await readTextFile(configPath);
  } catch (err) {
    print.error(`Failed to read config: ${(err as Error).message}`);
    return 3;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    print.error(`Invalid JSON in ${configPath}`);
    print.error((err as Error).message);
    return 2;
  }

  try {
    const config = validateConfig(parsed);
    print.success(`Valid config: ${config.experiments.length} experiment(s)`);

    if (options.verbose) {
      for (const exp of config.experiments) {
        console.log(
          `  ${color.cyan(exp.id)} — ${exp.variants.length} variants, ` +
            `assignment: ${exp.assignment ?? "default"}, ` +
            `status: ${exp.status ?? "active"}`,
        );
      }
    }

    return 0;
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      print.error(`Validation failed with ${err.issues.length} issue(s):`);
      console.log("");
      for (const issue of err.issues) {
        console.log(`  ${color.red(issue.code)} at ${color.yellow(issue.path)}`);
        console.log(`    ${issue.message}`);
      }
      console.log("");
      return 2;
    }
    print.error(`Unexpected error: ${(err as Error).message}`);
    return 2;
  }
}
