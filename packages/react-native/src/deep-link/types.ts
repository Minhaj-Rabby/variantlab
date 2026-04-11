/**
 * Share-payload types used by `encode.ts`, `validate.ts`, and the deep
 * link handler. Mirrors the on-the-wire format from `qr-sharing.md`.
 *
 * The wire format is intentionally tiny: a JSON document that base64url-
 * encodes (and optionally compresses) into a URL query parameter. We
 * version it via `v` so a future format can be added without breaking
 * existing scanners.
 */
import type { VariantContext } from "@variantlab/core";

/** Supported payload schema versions. Currently only `1`. */
export type ShareVersion = 1;

/** A decoded share payload. */
export interface SharePayload {
  /** Schema version. */
  readonly v: ShareVersion;
  /** Map of experiment id → variant id to apply. */
  readonly overrides: Readonly<Record<string, string>>;
  /** Optional context overrides applied via `engine.updateContext`. */
  readonly context?: Partial<VariantContext>;
  /** Optional Unix-ms expiry. Payloads past this are rejected. */
  readonly expires?: number;
}

/** Lightweight result of validating a candidate payload. */
export type ValidationResult =
  | { readonly ok: true; readonly payload: SharePayload }
  | { readonly ok: false; readonly reason: ValidationFailure };

export type ValidationFailure =
  | "not-an-object"
  | "bad-version"
  | "missing-overrides"
  | "overrides-too-large"
  | "bad-override-key"
  | "bad-override-value"
  | "bad-context"
  | "expired"
  | "payload-too-large"
  | "prototype-pollution";
