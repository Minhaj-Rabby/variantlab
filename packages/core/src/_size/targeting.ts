/**
 * Fake entrypoint for size-limit measurement of the `targeting/`
 * module in isolation. Not part of the public export map (hence the
 * leading underscore). Do not import from here at runtime.
 */
export * from "../targeting/index.js";
