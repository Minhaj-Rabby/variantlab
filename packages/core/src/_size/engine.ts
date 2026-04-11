/**
 * Fake entrypoint for size-limit measurement of the assignment +
 * history + engine modules in isolation. Not part of the public
 * export map (hence the leading underscore). Do not import from
 * here at runtime.
 */
export { createEngine, VariantEngine } from "../engine/index.js";
