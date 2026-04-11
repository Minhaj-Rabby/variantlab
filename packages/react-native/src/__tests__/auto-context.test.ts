/**
 * Tests for `getAutoContext()` and its pure helpers.
 *
 * The function's native-module reads are tested by exercising them
 * through the `react-native` stub registered in `setup.ts`. Locale
 * detection is exercised by injecting a fake `expo-localization` module
 * into the options bag.
 */
import { describe, expect, it } from "vitest";
import { bucketScreenWidth, getAutoContext } from "../context/auto-context.js";

describe("bucketScreenWidth", () => {
  it("maps iPhone SE-class widths to small", () => {
    expect(bucketScreenWidth(320)).toBe("small");
    expect(bucketScreenWidth(359.9)).toBe("small");
  });

  it("maps phone-class widths to medium", () => {
    expect(bucketScreenWidth(360)).toBe("medium");
    expect(bucketScreenWidth(390)).toBe("medium");
    expect(bucketScreenWidth(767)).toBe("medium");
  });

  it("maps tablet-class widths to large", () => {
    expect(bucketScreenWidth(768)).toBe("large");
    expect(bucketScreenWidth(1366)).toBe("large");
  });
});

describe("getAutoContext", () => {
  it("fills in platform and screenSize from the react-native stub", () => {
    const ctx = getAutoContext();
    expect(ctx.platform).toBe("ios");
    expect(ctx.screenSize).toBe("medium"); // mocked width 390
  });

  it("returns a context without the optional fields when no modules inject them", () => {
    const ctx = getAutoContext();
    expect(ctx.locale).toBeUndefined();
    expect(ctx.appVersion).toBeUndefined();
  });

  it("reads locale from injected expo-localization", () => {
    const ctx = getAutoContext({
      localization: {
        getLocales: () => [{ languageTag: "en-US" }],
      },
    });
    expect(ctx.locale).toBe("en-US");
  });

  it("reads appVersion from injected expo-constants", () => {
    const ctx = getAutoContext({
      constants: { expoConfig: { version: "1.2.3" } },
    });
    expect(ctx.appVersion).toBe("1.2.3");
  });

  it("tolerates a throwing localization module", () => {
    const ctx = getAutoContext({
      localization: {
        getLocales: () => {
          throw new Error("boom");
        },
      },
    });
    expect(ctx.locale).toBeUndefined();
  });

  it("omits appVersion when expoConfig is missing", () => {
    const ctx = getAutoContext({ constants: { expoConfig: null } });
    expect(ctx.appVersion).toBeUndefined();
  });
});
