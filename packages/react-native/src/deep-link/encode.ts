/**
 * Encode and decode share payloads for deep links and QR codes.
 *
 * The wire format is documented in `docs/features/qr-sharing.md`:
 *
 *   1. Serialise the payload as compact JSON.
 *   2. Optionally gzip-like compress (deferred — we ship plain base64
 *      first; the wire format is forward-compatible because the prefix
 *      byte tells the decoder which mode was used).
 *   3. Base64url-encode the bytes (RFC 4648 §5: `+` → `-`, `/` → `_`,
 *      no `=` padding).
 *
 * We implement base64url by hand because we cannot rely on
 * `globalThis.btoa` / `Buffer` being present on every RN runtime,
 * and pulling in a base64 polyfill would burst the bundle budget.
 * The encoder/decoder operates on UTF-8 byte arrays via `TextEncoder`
 * / `TextDecoder`, both of which ship in Hermes.
 *
 * The format prefix byte is `0` for "raw JSON" and reserved for future
 * compression schemes (`1` = deflate-raw, `2` = brotli, etc.). On
 * decode we tolerate a missing prefix to keep older clients working.
 */
import type { SharePayload, ValidationResult } from "./types.js";
import { validatePayload } from "./validate.js";

const PREFIX_RAW = 0;

/**
 * Encode a payload to its on-the-wire base64url string. Throws on
 * the rare case where validation fails on a payload constructed by
 * the caller themselves — that's a developer error worth surfacing.
 */
export function encodeSharePayload(payload: SharePayload): string {
  const validated = validatePayload(payload);
  if (!validated.ok) {
    throw new Error(`Cannot encode invalid share payload: ${validated.reason}`);
  }
  const json = JSON.stringify(validated.payload);
  const utf8 = new TextEncoder().encode(json);
  const framed = new Uint8Array(utf8.length + 1);
  framed[0] = PREFIX_RAW;
  framed.set(utf8, 1);
  return bytesToBase64Url(framed);
}

/**
 * Decode a base64url string back into a validated payload. Returns
 * a `ValidationResult` so callers can branch on `ok` rather than
 * wrap the call in try/catch.
 */
export function decodeSharePayload(encoded: string, now?: number): ValidationResult {
  let bytes: Uint8Array;
  try {
    bytes = base64UrlToBytes(encoded);
  } catch {
    return { ok: false, reason: "not-an-object" };
  }
  if (bytes.length === 0) return { ok: false, reason: "not-an-object" };

  // Detect prefix; tolerate missing prefix for forward compatibility.
  let jsonBytes: Uint8Array;
  if (bytes[0] === PREFIX_RAW) {
    jsonBytes = bytes.subarray(1);
  } else {
    jsonBytes = bytes;
  }

  let parsed: unknown;
  try {
    const json = new TextDecoder("utf-8", { fatal: true }).decode(jsonBytes);
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, reason: "not-an-object" };
  }

  return validatePayload(parsed, now);
}

// ---------- base64url ------------------------------------------------------

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const DECODE_TABLE: Int8Array = (() => {
  const table = new Int8Array(128);
  table.fill(-1);
  for (let i = 0; i < ALPHABET.length; i++) {
    table[ALPHABET.charCodeAt(i)] = i;
  }
  // Accept the standard b64 variants too so links pasted from a
  // non-url-safe encoder still decode.
  table["+".charCodeAt(0)] = 62;
  table["/".charCodeAt(0)] = 63;
  return table;
})();

export function bytesToBase64Url(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  for (; i + 3 <= bytes.length; i += 3) {
    const b0 = bytes[i] as number;
    const b1 = bytes[i + 1] as number;
    const b2 = bytes[i + 2] as number;
    out += ALPHABET[b0 >> 2];
    out += ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)];
    out += ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)];
    out += ALPHABET[b2 & 0x3f];
  }
  if (i < bytes.length) {
    const b0 = bytes[i] as number;
    out += ALPHABET[b0 >> 2];
    if (i + 1 < bytes.length) {
      const b1 = bytes[i + 1] as number;
      out += ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)];
      out += ALPHABET[(b1 & 0x0f) << 2];
    } else {
      out += ALPHABET[(b0 & 0x03) << 4];
    }
  }
  return out;
}

export function base64UrlToBytes(input: string): Uint8Array {
  // Strip optional `=` padding from standard base64.
  let s = input;
  while (s.length > 0 && s[s.length - 1] === "=") s = s.slice(0, -1);
  if (s.length === 0) return new Uint8Array(0);

  const remainder = s.length & 3;
  if (remainder === 1) throw new Error("Invalid base64url length");

  const fullGroups = (s.length - remainder) >> 2;
  const outLen = fullGroups * 3 + (remainder === 0 ? 0 : remainder - 1);
  const out = new Uint8Array(outLen);

  let outIdx = 0;
  let i = 0;
  for (let g = 0; g < fullGroups; g++, i += 4) {
    const c0 = decodeChar(s.charCodeAt(i));
    const c1 = decodeChar(s.charCodeAt(i + 1));
    const c2 = decodeChar(s.charCodeAt(i + 2));
    const c3 = decodeChar(s.charCodeAt(i + 3));
    out[outIdx++] = (c0 << 2) | (c1 >> 4);
    out[outIdx++] = ((c1 & 0x0f) << 4) | (c2 >> 2);
    out[outIdx++] = ((c2 & 0x03) << 6) | c3;
  }
  if (remainder >= 2) {
    const c0 = decodeChar(s.charCodeAt(i));
    const c1 = decodeChar(s.charCodeAt(i + 1));
    out[outIdx++] = (c0 << 2) | (c1 >> 4);
    if (remainder === 3) {
      const c2 = decodeChar(s.charCodeAt(i + 2));
      out[outIdx++] = ((c1 & 0x0f) << 4) | (c2 >> 2);
    }
  }
  return out;
}

function decodeChar(code: number): number {
  if (code >= 128) throw new Error("Invalid base64url character");
  const v = DECODE_TABLE[code] ?? -1;
  if (v < 0) throw new Error("Invalid base64url character");
  return v;
}
