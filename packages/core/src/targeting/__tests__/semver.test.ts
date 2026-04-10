import { describe, expect, it } from "vitest";
import { matchSemver } from "../index.js";
import { cmpVersion, matchCompiled, parseSemver, parseVersion } from "../semver.js";

describe("parseVersion", () => {
  it("parses simple versions", () => {
    expect(parseVersion("0.0.0")).toEqual([0, 0, 0]);
    expect(parseVersion("1.0.0")).toEqual([1, 0, 0]);
    expect(parseVersion("10.20.30")).toEqual([10, 20, 30]);
    expect(parseVersion("999.999.999")).toEqual([999, 999, 999]);
  });

  it("rejects empty or incomplete versions", () => {
    expect(parseVersion("")).toBeNull();
    expect(parseVersion("1")).toBeNull();
    expect(parseVersion("1.2")).toBeNull();
    expect(parseVersion("1.2.")).toBeNull();
    expect(parseVersion(".1.2")).toBeNull();
    expect(parseVersion("1..2")).toBeNull();
  });

  it("rejects versions with too many parts", () => {
    expect(parseVersion("1.2.3.4")).toBeNull();
  });

  it("rejects x-wildcards", () => {
    expect(parseVersion("1.2.x")).toBeNull();
    expect(parseVersion("1.x.0")).toBeNull();
  });

  it("rejects prereleases", () => {
    expect(parseVersion("1.2.3-beta")).toBeNull();
    expect(parseVersion("1.2.3-rc.1")).toBeNull();
  });

  it("rejects build metadata", () => {
    expect(parseVersion("1.2.3+sha")).toBeNull();
    expect(parseVersion("1.2.3+abc.def")).toBeNull();
  });

  it("rejects a leading v prefix", () => {
    expect(parseVersion("v1.2.3")).toBeNull();
  });

  it("rejects negative numbers", () => {
    expect(parseVersion("1.2.-1")).toBeNull();
    expect(parseVersion("-1.2.3")).toBeNull();
  });

  it("rejects non-digit tails", () => {
    expect(parseVersion("1.2.3abc")).toBeNull();
    expect(parseVersion("a.b.c")).toBeNull();
  });
});

describe("cmpVersion", () => {
  it("returns 0 for equal versions", () => {
    expect(cmpVersion([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it("returns negative when a < b", () => {
    expect(cmpVersion([1, 2, 3], [1, 2, 4])).toBeLessThan(0);
    expect(cmpVersion([1, 2, 3], [1, 3, 0])).toBeLessThan(0);
    expect(cmpVersion([1, 2, 3], [2, 0, 0])).toBeLessThan(0);
  });

  it("returns positive when a > b", () => {
    expect(cmpVersion([2, 0, 0], [1, 9, 9])).toBeGreaterThan(0);
    expect(cmpVersion([1, 3, 0], [1, 2, 9])).toBeGreaterThan(0);
    expect(cmpVersion([1, 2, 4], [1, 2, 3])).toBeGreaterThan(0);
  });
});

describe("parseSemver — successes", () => {
  it("parses a bare version as =", () => {
    expect(parseSemver("1.0.0")).not.toBeNull();
    expect(matchSemver("1.0.0", "1.0.0")).toBe(true);
    expect(matchSemver("1.0.0", "1.0.1")).toBe(false);
  });

  it("parses all comparator operators", () => {
    expect(matchSemver("=1.0.0", "1.0.0")).toBe(true);
    expect(matchSemver(">1.0.0", "1.0.1")).toBe(true);
    expect(matchSemver(">1.0.0", "1.0.0")).toBe(false);
    expect(matchSemver(">=1.0.0", "1.0.0")).toBe(true);
    expect(matchSemver("<2.0.0", "1.9.9")).toBe(true);
    expect(matchSemver("<2.0.0", "2.0.0")).toBe(false);
    expect(matchSemver("<=2.0.0", "2.0.0")).toBe(true);
  });

  it("parses caret ranges", () => {
    // ^1.2.3 → [>=1.2.3, <2.0.0]
    expect(matchSemver("^1.2.3", "1.2.3")).toBe(true);
    expect(matchSemver("^1.2.3", "1.9.9")).toBe(true);
    expect(matchSemver("^1.2.3", "2.0.0")).toBe(false);
    expect(matchSemver("^1.2.3", "1.2.2")).toBe(false);
  });

  it("parses tilde ranges", () => {
    // ~1.2.3 → [>=1.2.3, <1.3.0]
    expect(matchSemver("~1.2.3", "1.2.3")).toBe(true);
    expect(matchSemver("~1.2.3", "1.2.9")).toBe(true);
    expect(matchSemver("~1.2.3", "1.3.0")).toBe(false);
    expect(matchSemver("~1.2.3", "1.2.2")).toBe(false);
  });

  it("parses hyphen ranges", () => {
    // 1.0.0 - 2.0.0 → [>=1.0.0, <=2.0.0]
    expect(matchSemver("1.0.0 - 2.0.0", "1.0.0")).toBe(true);
    expect(matchSemver("1.0.0 - 2.0.0", "1.5.0")).toBe(true);
    expect(matchSemver("1.0.0 - 2.0.0", "2.0.0")).toBe(true);
    expect(matchSemver("1.0.0 - 2.0.0", "2.0.1")).toBe(false);
    expect(matchSemver("1.0.0 - 2.0.0", "0.9.9")).toBe(false);
  });

  it("parses compound (AND) ranges", () => {
    expect(matchSemver(">=1.0.0 <2.0.0", "1.5.0")).toBe(true);
    expect(matchSemver(">=1.0.0 <2.0.0", "2.0.0")).toBe(false);
    expect(matchSemver(">=1.0.0 <2.0.0", "0.9.9")).toBe(false);
  });

  it("parses OR ranges", () => {
    expect(matchSemver(">=1.0.0 <2.0.0 || >=3.0.0", "1.5.0")).toBe(true);
    expect(matchSemver(">=1.0.0 <2.0.0 || >=3.0.0", "3.1.0")).toBe(true);
    expect(matchSemver(">=1.0.0 <2.0.0 || >=3.0.0", "2.5.0")).toBe(false);
    expect(matchSemver(">=1.0.0 <2.0.0 || >=3.0.0", "0.9.9")).toBe(false);
  });

  it("^0.0.1 uses the simple spec: [>=0.0.1, <1.0.0]", () => {
    // We implement the simpler `^X.Y.Z → [>=X.Y.Z, <(X+1).0.0]` rule
    // rather than npm's 0.x.x special case. Documented here.
    expect(matchSemver("^0.0.1", "0.0.1")).toBe(true);
    expect(matchSemver("^0.0.1", "0.5.0")).toBe(true);
    expect(matchSemver("^0.0.1", "0.99.99")).toBe(true);
    expect(matchSemver("^0.0.1", "1.0.0")).toBe(false);
  });
});

describe("parseSemver — failures", () => {
  it("rejects empty input", () => {
    expect(parseSemver("")).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(parseSemver("not-a-version")).toBeNull();
    expect(parseSemver("foo bar baz")).toBeNull();
  });

  it("rejects a hyphen range with an invalid core version", () => {
    expect(parseSemver("not-a-version - 2.0.0")).toBeNull();
    expect(parseSemver("1.0.0 - garbage")).toBeNull();
  });

  it("rejects a trailing OR clause", () => {
    expect(parseSemver("1.0.0 ||")).toBeNull();
    expect(parseSemver("|| 1.0.0")).toBeNull();
  });

  it("rejects a comparator with no version", () => {
    expect(parseSemver(">=")).toBeNull();
    expect(parseSemver(">")).toBeNull();
    expect(parseSemver("^")).toBeNull();
    expect(parseSemver("~")).toBeNull();
  });

  it("rejects prerelease in a range", () => {
    expect(parseSemver(">=1.2.3-beta")).toBeNull();
    expect(parseSemver("^1.0.0-rc.1")).toBeNull();
  });
});

describe("matchSemver — falsey on parse error", () => {
  it("returns false for unparseable ranges", () => {
    expect(matchSemver("not-a-range", "1.0.0")).toBe(false);
  });

  it("returns false for unparseable versions", () => {
    expect(matchSemver(">=1.0.0", "not-a-version")).toBe(false);
  });
});

describe("matchCompiled — hot path", () => {
  it("matches precompiled ranges", () => {
    const range = parseSemver(">=1.0.0 <2.0.0");
    expect(range).not.toBeNull();
    if (range === null) return;
    expect(matchCompiled(range, [1, 5, 0])).toBe(true);
    expect(matchCompiled(range, [2, 0, 0])).toBe(false);
    expect(matchCompiled(range, [0, 9, 9])).toBe(false);
  });
});
