/**
 * Tests for the QR helpers (`/qr` entrypoint).
 */
import { describe, expect, it } from "vitest";
import { buildQrUrl, parseQrUrl, VARIANTLAB_APPLY_PATH, VARIANTLAB_URL_SCHEME } from "../qr.js";

describe("buildQrUrl", () => {
  it("produces a variantlab:// URL with the encoded payload", () => {
    const url = buildQrUrl({ v: 1, overrides: { hero: "variant-b" } });
    expect(url.startsWith(`${VARIANTLAB_URL_SCHEME}://${VARIANTLAB_APPLY_PATH}?d=`)).toBe(true);
  });
});

describe("parseQrUrl", () => {
  it("round-trips a payload", () => {
    const payload = { v: 1, overrides: { hero: "variant-b" } } as const;
    const url = buildQrUrl(payload);
    const result = parseQrUrl(url);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.overrides).toEqual(payload.overrides);
    }
  });

  it("accepts foreign schemes that carry the same ?d param", () => {
    const payload = { v: 1, overrides: { hero: "variant-b" } } as const;
    const encoded = buildQrUrl(payload).split("?d=")[1] as string;
    const result = parseQrUrl(`myapp://handle-variantlab?d=${encoded}`);
    expect(result.ok).toBe(true);
  });

  it("returns a validation failure for URLs without ?d", () => {
    const result = parseQrUrl("variantlab://apply");
    expect(result.ok).toBe(false);
  });

  it("returns a validation failure for garbage payloads", () => {
    const result = parseQrUrl("variantlab://apply?d=!!!!");
    expect(result.ok).toBe(false);
  });
});
