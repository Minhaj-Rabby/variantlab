/**
 * `getAutoContext()` — best-effort detection of the runtime context
 * for variantlab targeting on React Native.
 *
 * The goal is to fill in `platform`, `screenSize`, and `locale` from
 * native modules so that targeting like `{ platform: ["ios"] }` and
 * `{ screenSize: ["small"] }` Just Works without the user having to
 * import any RN modules themselves. `appVersion` is filled in when
 * `expo-constants` is installed (it almost always is on Expo apps).
 *
 * Implementation rules:
 *
 *   - Every native module is imported through a guarded `try / require`
 *     so a missing optional peer never crashes. Failing to read any
 *     individual field returns `undefined` for that field — never throws.
 *   - The function is **synchronous** because variantlab's resolution
 *     hot path is synchronous; we cannot wait on a Promise here.
 *   - Locale detection prefers `expo-localization` (the only RN-supported
 *     way that works in production). Falls back to `NativeModules` for
 *     bare RN apps and finally to `undefined`.
 *
 * The screen-size buckets follow the same thresholds as the rest of
 * variantlab (see `targeting-dsl.md`):
 *
 *   - small  → < 360 pt wide  (iPhone SE, older Androids)
 *   - medium → 360–767 pt wide (most phones)
 *   - large  → ≥ 768 pt wide (tablets, foldables in unfolded mode)
 */

import type { VariantContext } from "@variantlab/core";
import { Dimensions, NativeModules, Platform } from "react-native";

export interface AutoContextOptions {
  /** Inject `expo-constants` for `appVersion`. Optional. */
  readonly constants?: { expoConfig?: { version?: string } | null } | null;
  /** Inject `expo-localization` for `locale`. Optional. */
  readonly localization?: { getLocales: () => Array<{ languageTag: string }> } | null;
}

export function getAutoContext(options: AutoContextOptions = {}): VariantContext {
  // `VariantContext`'s fields are `readonly`, so we build the object
  // immutably rather than mutating in place. The intermediate
  // `Partial<Mutable>` lets us omit unset fields without `undefined`
  // values leaking through under `exactOptionalPropertyTypes`.
  const out: {
    -readonly [K in keyof VariantContext]?: VariantContext[K];
  } = {};
  const platform = detectPlatform();
  if (platform !== undefined) out.platform = platform;
  const screenSize = detectScreenSize();
  if (screenSize !== undefined) out.screenSize = screenSize;
  const locale = detectLocale(options.localization);
  if (locale !== undefined) out.locale = locale;
  const appVersion = detectAppVersion(options.constants);
  if (appVersion !== undefined) out.appVersion = appVersion;
  return out;
}

function detectPlatform(): VariantContext["platform"] | undefined {
  try {
    const os = Platform.OS;
    if (os === "ios" || os === "android" || os === "web") return os;
    return undefined;
  } catch {
    return undefined;
  }
}

export type ScreenSizeBucket = NonNullable<VariantContext["screenSize"]>;

export function bucketScreenWidth(width: number): ScreenSizeBucket {
  if (width < 360) return "small";
  if (width < 768) return "medium";
  return "large";
}

function detectScreenSize(): ScreenSizeBucket | undefined {
  try {
    const { width } = Dimensions.get("window");
    if (typeof width !== "number" || Number.isNaN(width) || width <= 0) return undefined;
    return bucketScreenWidth(width);
  } catch {
    return undefined;
  }
}

function detectLocale(localization: AutoContextOptions["localization"]): string | undefined {
  // Prefer the dependency-injected expo-localization module.
  if (localization !== undefined && localization !== null) {
    try {
      const locales = localization.getLocales();
      const first = locales[0];
      if (first !== undefined && typeof first.languageTag === "string") {
        return first.languageTag;
      }
    } catch {
      // fall through to native modules
    }
  }

  // Bare RN: read from NativeModules. The shape is documented but
  // varies between iOS, Android, and the New Architecture, so we
  // pick the first thing that looks like a BCP-47 tag.
  try {
    const settings = NativeModules.SettingsManager as
      | { settings?: { AppleLocale?: string; AppleLanguages?: string[] } }
      | undefined;
    const apple = settings?.settings?.AppleLocale ?? settings?.settings?.AppleLanguages?.[0];
    if (typeof apple === "string" && apple.length > 0) return normalizeTag(apple);

    // Android's turbo module exposes `localeIdentifier` on the bridged
    // `I18nManager` native module. We look it up through `NativeModules`
    // rather than the JS-side `I18nManager` export because the type
    // surface of the latter intentionally omits the field.
    const i18n = NativeModules.I18nManager as { localeIdentifier?: string } | undefined;
    if (typeof i18n?.localeIdentifier === "string" && i18n.localeIdentifier.length > 0) {
      return normalizeTag(i18n.localeIdentifier);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function normalizeTag(raw: string): string {
  // Convert iOS `en_US` style to BCP-47 `en-US`.
  return raw.replace(/_/g, "-");
}

function detectAppVersion(constants: AutoContextOptions["constants"]): string | undefined {
  if (constants === undefined || constants === null) return undefined;
  try {
    const version = constants.expoConfig?.version;
    if (typeof version === "string" && version.length > 0) return version;
  } catch {
    return undefined;
  }
  return undefined;
}
