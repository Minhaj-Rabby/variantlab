export const VERSION = "0.0.0";

export { init, type InitOptions } from "./commands/init.js";
export { generate, type GenerateOptions } from "./commands/generate.js";
export { validate, type ValidateOptions } from "./commands/validate.js";
export { evalCommand, type EvalOptions } from "./commands/eval.js";
export { parseArgs, type ParsedArgs } from "./utils/arg-parser.js";
