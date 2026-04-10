import { describe, expect, it } from "vitest";
import { matchLocale } from "../../operators/locale.js";

describe("matchLocale", () => {
  it("matches exact locales", () => {
    expect(matchLocale(["en-US"], "en-US")).toBe(true);
  });

  it("matches prefixes with a hyphen separator", () => {
    expect(matchLocale(["en"], "en")).toBe(true);
    expect(matchLocale(["en"], "en-US")).toBe(true);
    expect(matchLocale(["en"], "en-GB")).toBe(true);
  });

  it("matches multi-part prefix targets", () => {
    expect(matchLocale(["en-US"], "en-US-POSIX")).toBe(true);
  });

  it("does not match unrelated locales", () => {
    expect(matchLocale(["en"], "fr")).toBe(false);
    expect(matchLocale(["en-US"], "en-GB")).toBe(false);
    expect(matchLocale(["en-US"], "en")).toBe(false);
  });

  it("does not partial-match without a hyphen boundary", () => {
    // "eng" should not match target "en" — it's a different language code.
    expect(matchLocale(["en"], "eng")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(matchLocale(["en-US"], "en-us")).toBe(false);
  });

  it("fails when the context locale is undefined", () => {
    expect(matchLocale(["en"], undefined)).toBe(false);
  });

  it("supports multiple target locales", () => {
    expect(matchLocale(["fr", "es", "en"], "es-MX")).toBe(true);
    expect(matchLocale(["fr", "es", "en"], "de-DE")).toBe(false);
  });
});
