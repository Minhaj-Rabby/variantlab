/**
 * `@variantlab/react-native/qr` — QR code sharing helpers.
 *
 * Exposes two tiny helpers: one to turn a variantlab `SharePayload`
 * into an `otpauth://`-style URL that can be rendered as a QR code,
 * and one to consume such a URL when it's scanned back in. The actual
 * QR rendering is **not** included in this package — `react-native-svg`
 * is a huge optional peer, and the Phase 1 kickoff prompt in
 * `docs/phases/phase-1-kickoff-prompts.md` §6.5 says to ship a
 * renderer-agnostic stub:
 *
 *     import QRCode from "react-native-qrcode-svg";
 *     import { buildQrUrl } from "@variantlab/react-native/qr";
 *
 *     const url = buildQrUrl(engine, { v: 1, overrides: { hero: "b" } });
 *     <QRCode value={url} size={220} />
 *
 * The URL format is `variantlab://apply?d=<base64url>` where the
 * base64url payload is identical to the deep-link encoder. That means
 * a QR code and a deep link are interchangeable: scanning a QR is
 * literally equivalent to tapping a shared URL.
 *
 * A richer QR feature (signing with HMAC, scan validation, in-overlay
 * scanner) is scheduled for Phase 2. This entrypoint exists today so
 * the wire format is stable and tree-shakeable from day one.
 */

import { decodeSharePayload, encodeSharePayload } from "./deep-link/encode.js";
import type { SharePayload, ValidationResult } from "./deep-link/types.js";

/** The scheme used for variantlab's own share URLs. */
export const VARIANTLAB_URL_SCHEME = "variantlab";
/** The canonical path that applies a share payload. */
export const VARIANTLAB_APPLY_PATH = "apply";

/**
 * Build a `variantlab://apply?d=...` URL from a share payload.
 *
 * Safe to call with any well-formed payload — invalid payloads throw
 * (see `encodeSharePayload`). Pair the return value with any
 * off-the-shelf `<QRCode />` component.
 */
export function buildQrUrl(payload: SharePayload): string {
  const encoded = encodeSharePayload(payload);
  return `${VARIANTLAB_URL_SCHEME}://${VARIANTLAB_APPLY_PATH}?d=${encoded}`;
}

/**
 * Parse a scanned QR URL and return the validated payload. Mirrors
 * the deep-link handler's tolerance: we accept both
 * `variantlab://apply?d=...` and any other scheme whose query string
 * carries a `d=` parameter, so host apps can reuse their own URL
 * scheme (e.g. `myapp://variantlab?d=...`).
 *
 * Returns a `ValidationResult` rather than throwing, matching
 * `decodeSharePayload`.
 */
export function parseQrUrl(url: string, now?: number): ValidationResult {
  const q = extractDataParam(url);
  if (q === null) return { ok: false, reason: "not-an-object" };
  return decodeSharePayload(q, now);
}

/**
 * Extracts the `d` query parameter from a URL string without relying
 * on `URL` (RN's URL polyfill is historically flaky). Returns `null`
 * if the URL has no `d=` param.
 */
function extractDataParam(url: string): string | null {
  const q = url.indexOf("?");
  if (q < 0) return null;
  const hashEnd = url.indexOf("#", q);
  const query = hashEnd < 0 ? url.slice(q + 1) : url.slice(q + 1, hashEnd);
  for (const pair of query.split("&")) {
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const key = pair.slice(0, eq);
    if (key !== "d") continue;
    try {
      return decodeURIComponent(pair.slice(eq + 1));
    } catch {
      return null;
    }
  }
  return null;
}
