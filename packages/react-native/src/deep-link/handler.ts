/**
 * Deep link handler for variantlab share payloads.
 *
 * Wires React Native's `Linking` module to the engine: when the OS
 * delivers a URL with our share scheme, we decode the `?p=...` query
 * parameter, validate it, and apply the overrides.
 *
 * Design notes:
 *
 *   - The handler accepts the engine *and* the `Linking` module from
 *     the caller. In a real app the caller passes `Linking` from
 *     `react-native`; in tests the caller passes a mock that records
 *     `addEventListener` and `getInitialURL` calls. This keeps the
 *     module free of any real RN imports for the test runner.
 *   - URL parsing is hand-rolled because RN's `URL` polyfill is
 *     unreliable across versions and we only need to extract one
 *     query param.
 *   - Each apply emits via `engine.setVariant(id, variantId, "deeplink")`
 *     so the source field on `variantChanged` events lets debug overlays
 *     and telemetry distinguish deep-link writes from manual ones.
 *   - We rate-limit deep-link applies to one per second by default
 *     (`qr-sharing.md` §Rate limiting). Callers can override the
 *     interval but cannot disable it entirely.
 */
import type { VariantEngine } from "@variantlab/core";
import { decodeSharePayload } from "./encode.js";
import type { SharePayload, ValidationFailure } from "./types.js";

/** The minimal Linking surface we depend on. */
export interface LinkingLike {
  addEventListener(type: "url", handler: (event: { url: string }) => void): { remove: () => void };
  getInitialURL(): Promise<string | null>;
}

export interface RegisterDeepLinkOptions {
  /** App URL scheme, e.g. `"drishtikon"`. Required to filter foreign URLs. */
  readonly scheme?: string;
  /** Optional host portion, e.g. `"variantlab"`. Defaults to any host. */
  readonly host?: string;
  /** Query parameter holding the encoded payload. Default: `"p"`. */
  readonly param?: string;
  /** Called after each successful apply with the decoded payload. */
  readonly onApply?: (payload: SharePayload) => void;
  /** Called whenever a candidate link fails validation. */
  readonly onError?: (reason: ValidationFailure | "wrong-scheme" | "no-payload") => void;
  /** Minimum ms between successful applies. Default: 1000. */
  readonly minIntervalMs?: number;
}

/**
 * Register the deep-link handler. Returns an unsubscribe function
 * that removes the listener and stops handling pending initial URLs.
 *
 * The handler also fires once for the URL that launched the app
 * (via `getInitialURL`) so cold-launches via QR scan still apply
 * the override on first render.
 */
export function registerDeepLinkHandler(
  engine: VariantEngine,
  linking: LinkingLike,
  options: RegisterDeepLinkOptions = {},
): () => void {
  const param = options.param ?? "p";
  const minInterval = options.minIntervalMs ?? 1000;
  let lastApplyAt = 0;
  let disposed = false;

  const handle = (url: string | null): void => {
    if (disposed || url === null || url.length === 0) return;
    if (!schemeMatches(url, options.scheme, options.host)) {
      options.onError?.("wrong-scheme");
      return;
    }
    const encoded = extractQueryParam(url, param);
    if (encoded === null) {
      options.onError?.("no-payload");
      return;
    }
    const result = decodeSharePayload(encoded);
    if (!result.ok) {
      options.onError?.(result.reason);
      return;
    }
    const now = Date.now();
    if (now - lastApplyAt < minInterval) {
      // Silently drop — rate limiting is a security feature, not an error.
      return;
    }
    lastApplyAt = now;
    applyPayload(engine, result.payload);
    options.onApply?.(result.payload);
  };

  const subscription = linking.addEventListener("url", (event) => handle(event.url));
  // Fire-and-forget the initial URL — RN promises are not awaited at
  // module load time.
  void linking
    .getInitialURL()
    .then(handle)
    .catch(() => undefined);

  return () => {
    if (disposed) return;
    disposed = true;
    subscription.remove();
  };
}

/**
 * Apply a previously-decoded payload to the engine. Exposed publicly
 * so callers that build their own URL-handling pipeline (Next.js
 * middleware, web router) can reuse the same logic.
 */
export function applyPayload(engine: VariantEngine, payload: SharePayload): void {
  if (payload.context !== undefined) {
    engine.updateContext(payload.context);
  }
  for (const id of Object.keys(payload.overrides)) {
    const variantId = payload.overrides[id];
    if (variantId === undefined) continue;
    engine.setVariant(id, variantId, "deeplink");
  }
}

function schemeMatches(url: string, scheme?: string, host?: string): boolean {
  // Format: `<scheme>://<host>/<path>?<query>`
  // Hand-rolled because RN's URL polyfill is unreliable.
  const colon = url.indexOf("://");
  if (colon < 0) return false;
  const urlScheme = url.slice(0, colon);
  if (scheme !== undefined && urlScheme !== scheme) return false;
  if (host !== undefined) {
    const rest = url.slice(colon + 3);
    const slash = rest.indexOf("/");
    const q = rest.indexOf("?");
    let endIdx = rest.length;
    if (slash >= 0) endIdx = slash;
    if (q >= 0 && q < endIdx) endIdx = q;
    const urlHost = rest.slice(0, endIdx);
    if (urlHost !== host) return false;
  }
  return true;
}

function extractQueryParam(url: string, name: string): string | null {
  const q = url.indexOf("?");
  if (q < 0) return null;
  // Strip optional `#fragment`.
  let query = url.slice(q + 1);
  const hash = query.indexOf("#");
  if (hash >= 0) query = query.slice(0, hash);
  for (const part of query.split("&")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = decodeURIComponent(part.slice(0, eq));
    if (key !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1));
    } catch {
      return null;
    }
  }
  return null;
}
