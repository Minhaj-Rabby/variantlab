/**
 * Fake entrypoint for size-limit measurement of the `config/` module
 * in isolation. Not part of the public export map (hence the leading
 * underscore). Do not import from here at runtime.
 */
export { ConfigValidationError, validateConfig } from "../config/index.js";
