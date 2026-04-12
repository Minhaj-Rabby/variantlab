import { parseArgs } from "../utils/arg-parser.js";
import * as print from "../utils/printer.js";

const VERSION = "0.0.0";

const USAGE = `
Usage: variantlab <command> [options]

Commands:
  init                    Scaffold experiments.json in the current directory
  generate                Generate TypeScript from experiments.json
  validate [path]         Validate an experiments.json config file
  eval [path]             Evaluate an experiment against a context

Options:
  --help                  Show this help message
  --version               Show version
  --verbose               Enable verbose output

Run "variantlab <command> --help" for command-specific help.
`.trim();

const INIT_HELP = `
Usage: variantlab init [options]

Scaffold a starter experiments.json in the current directory.

Options:
  --force     Overwrite existing experiments.json
  --verbose   Enable verbose output
  --help      Show this help message
`.trim();

const GENERATE_HELP = `
Usage: variantlab generate [options]

Generate TypeScript types from experiments.json.

Options:
  --config <path>   Path to experiments.json (default: ./experiments.json)
  --out <path>      Output path (default: ./src/variantlab.generated.ts)
  --watch           Watch for config changes and regenerate
  --verbose         Enable verbose output
  --help            Show this help message
`.trim();

const VALIDATE_HELP = `
Usage: variantlab validate [path] [options]

Validate an experiments.json config file.

Arguments:
  path        Path to config file (default: ./experiments.json)

Options:
  --verbose   Show experiment details on success
  --help      Show this help message
`.trim();

const EVAL_HELP = `
Usage: variantlab eval [path] [options]

Evaluate an experiment against a context and show targeting trace.

Arguments:
  path                    Path to config file (default: ./experiments.json)

Options:
  --experiment <id>       Experiment ID to evaluate (required)
  --context '<json>'      Inline JSON context
  --context-file <path>   Path to a JSON context file
  --verbose               Enable verbose output
  --help                  Show this help message
`.trim();

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.flags.version) {
    console.log(VERSION);
    process.exit(0);
  }

  if (!args.command || args.flags.help) {
    if (!args.command) {
      console.log(USAGE);
      process.exit(args.flags.help ? 0 : 4);
    }
  }

  const isVerbose = args.flags.verbose === true;

  switch (args.command) {
    case "init": {
      if (args.flags.help) {
        console.log(INIT_HELP);
        process.exit(0);
      }
      const { init } = await import("../commands/init.js");
      const code = await init({
        force: args.flags.force === true,
        verbose: isVerbose,
      });
      process.exit(code);
      break;
    }

    case "generate": {
      if (args.flags.help) {
        console.log(GENERATE_HELP);
        process.exit(0);
      }
      const { generate } = await import("../commands/generate.js");
      const code = await generate({
        config: typeof args.flags.config === "string" ? args.flags.config : undefined,
        out: typeof args.flags.out === "string" ? args.flags.out : undefined,
        watch: args.flags.watch === true,
        verbose: isVerbose,
      });
      process.exit(code);
      break;
    }

    case "validate": {
      if (args.flags.help) {
        console.log(VALIDATE_HELP);
        process.exit(0);
      }
      const { validate } = await import("../commands/validate.js");
      const configPath = args.positionals[0];
      const code = await validate(
        typeof configPath === "string" ? configPath : undefined,
        { verbose: isVerbose },
      );
      process.exit(code);
      break;
    }

    case "eval": {
      if (args.flags.help) {
        console.log(EVAL_HELP);
        process.exit(0);
      }
      const { evalCommand } = await import("../commands/eval.js");
      const configPath = args.positionals[0];
      const code = await evalCommand(
        typeof configPath === "string" ? configPath : undefined,
        {
          experiment: typeof args.flags.experiment === "string" ? args.flags.experiment : undefined,
          context: typeof args.flags.context === "string" ? args.flags.context : undefined,
          contextFile: typeof args.flags.contextFile === "string" ? args.flags.contextFile : undefined,
          verbose: isVerbose,
        },
      );
      process.exit(code);
      break;
    }

    default:
      print.error(`Unknown command: ${args.command}`);
      console.log("");
      console.log(USAGE);
      process.exit(4);
  }
}

main().catch((err: Error) => {
  print.error(err.message);
  process.exit(1);
});
