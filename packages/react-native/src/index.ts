/**
 * `@variantlab/react-native` — public barrel.
 *
 * This entrypoint deliberately **re-exports everything** from
 * `@variantlab/react` so a React Native app can
 *
 *     import { VariantLabProvider, useVariant } from "@variantlab/react-native";
 *
 * without the user having to remember that the hook layer lives in
 * the web-React package. The hooks and components are 100% compatible
 * with React Native — they rely only on React's own APIs.
 *
 * RN-specific surface sits alongside: storage adapters, auto-context
 * detection, and the deep-link handler. The debug overlay and the
 * QR helpers are intentionally split into their own sub-entrypoints
 * (`/debug`, `/qr`) so tree-shaking works at the package level:
 * production bundles that never import `/debug` do not pay for it.
 */

export const VERSION = "0.0.0";

// ---------- re-exports from @variantlab/react -----------------------------
export {
  type UseExperimentResult,
  useExperiment,
  useRouteExperiments,
  useSetVariant,
  useVariant,
  useVariantLabEngine,
  useVariantValue,
  Variant,
  VariantErrorBoundary,
  type VariantErrorBoundaryProps,
  VariantLabContext,
  VariantLabProvider,
  type VariantLabProviderProps,
  type VariantProps,
  VariantValue,
  type VariantValueProps,
} from "@variantlab/react";

// ---------- auto-context ---------------------------------------------------
export {
  type AutoContextOptions,
  bucketScreenWidth,
  getAutoContext,
  type ScreenSizeBucket,
} from "./context/auto-context.js";
// ---------- deep linking ---------------------------------------------------
export {
  applyPayload,
  base64UrlToBytes,
  bytesToBase64Url,
  decodeSharePayload,
  encodeSharePayload,
  type LinkingLike,
  type RegisterDeepLinkOptions,
  registerDeepLinkHandler,
  type SharePayload,
  type ShareVersion,
  type ValidationFailure,
  type ValidationResult,
  validatePayload,
} from "./deep-link/index.js";
// ---------- storage --------------------------------------------------------
export {
  type AsyncStorageLike,
  buildKey,
  createAsyncStorageAdapter,
  createMemoryStorage,
  createMMKVStorageAdapter,
  createSecureStoreAdapter,
  type MMKVLike,
  type SecureStoreLike,
  STORAGE_KEY_PREFIX,
  type Storage,
} from "./storage/index.js";
