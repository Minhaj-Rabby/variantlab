/**
 * Ambient globals for `@variantlab/react-native`.
 *
 * We only declare types that are not provided by any installed
 * package. Every peer (`react-native`, `@react-native-async-storage/*`,
 * `react-native-mmkv`, `expo-*`, etc.) ships its own `.d.ts`, so we
 * simply let the type resolver pick those up from `node_modules`.
 */

/** React Native injects this global in dev builds. */
declare const __DEV__: boolean | undefined;

/**
 * Minimal `process` ambient so our cross-runtime guards
 * (`typeof process !== "undefined" && process.env?.NODE_ENV === ...`)
 * type-check without pulling in the entirety of `@types/node`. On
 * React Native this is `undefined` at runtime; on Node (tests) it's
 * the real Node process object.
 */
declare const process:
  | undefined
  | {
      env?: Record<string, string | undefined>;
    };
