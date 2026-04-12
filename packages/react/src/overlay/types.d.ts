/**
 * Ambient globals for the debug overlay.
 *
 * The `@variantlab/react` package does not include `@types/node` — it
 * targets browsers. We declare a minimal `process` ambient so the
 * `typeof process !== "undefined" && process.env?.NODE_ENV` guards
 * type-check without pulling in the entirety of `@types/node`.
 */
declare const process:
  | undefined
  | {
      env?: Record<string, string | undefined>;
    };
