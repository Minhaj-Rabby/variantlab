import { describe, expect, it } from "vitest";
import { compileGlob, matchCompiledRoute } from "../glob.js";
import { matchRoute } from "../index.js";

describe("compileGlob — successes", () => {
  it("compiles exact paths", () => {
    expect(compileGlob("/about")).toEqual([{ kind: "literal", value: "about" }]);
    expect(compileGlob("/foo/bar")).toEqual([
      { kind: "literal", value: "foo" },
      { kind: "literal", value: "bar" },
    ]);
  });

  it("compiles single-segment wildcards", () => {
    expect(compileGlob("/blog/*")).toEqual([{ kind: "literal", value: "blog" }, { kind: "param" }]);
  });

  it("compiles deep wildcards at the tail", () => {
    expect(compileGlob("/docs/**")).toEqual([{ kind: "literal", value: "docs" }, { kind: "rest" }]);
  });

  it("compiles parameter segments", () => {
    expect(compileGlob("/user/:id")).toEqual([
      { kind: "literal", value: "user" },
      { kind: "param" },
    ]);
  });

  it("compiles the root `/`", () => {
    expect(compileGlob("/")).toEqual([]);
  });

  it("compiles bare `*` and `**` whole-path forms", () => {
    expect(compileGlob("*")).toEqual([{ kind: "param" }]);
    expect(compileGlob("**")).toEqual([{ kind: "rest" }]);
  });

  it("normalizes a trailing slash off the pattern", () => {
    expect(compileGlob("/about/")).toEqual([{ kind: "literal", value: "about" }]);
  });
});

describe("compileGlob — failures", () => {
  it("rejects empty input", () => {
    expect(compileGlob("")).toBeNull();
  });

  it("rejects paths without a leading slash", () => {
    expect(compileGlob("about")).toBeNull();
    expect(compileGlob("foo/bar")).toBeNull();
  });

  it("rejects `**` in a non-tail segment", () => {
    expect(compileGlob("/foo/**/bar")).toBeNull();
  });

  it("rejects `***`", () => {
    expect(compileGlob("/foo/***")).toBeNull();
    expect(compileGlob("/***/bad")).toBeNull();
  });

  it("rejects mixed literal + wildcard in a single segment", () => {
    expect(compileGlob("/foo*bar")).toBeNull();
    expect(compileGlob("/foo*/bar")).toBeNull();
  });

  it("rejects empty segments (double slash)", () => {
    expect(compileGlob("/foo//bar")).toBeNull();
  });

  it("rejects character classes, braces, and negation", () => {
    expect(compileGlob("/foo/[abc]")).toBeNull();
    expect(compileGlob("/foo/{a,b}")).toBeNull();
    expect(compileGlob("/foo/!bar")).toBeNull();
    expect(compileGlob("/foo/?bar")).toBeNull();
  });

  it("rejects a bare `:` parameter", () => {
    expect(compileGlob("/foo/:")).toBeNull();
  });
});

describe("matchRoute — matching", () => {
  it("matches exact paths", () => {
    expect(matchRoute("/about", "/about")).toBe(true);
    expect(matchRoute("/about", "/contact")).toBe(false);
  });

  it("matches single-segment wildcards", () => {
    expect(matchRoute("/blog/*", "/blog/post-1")).toBe(true);
    expect(matchRoute("/blog/*", "/blog")).toBe(false);
    expect(matchRoute("/blog/*", "/blog/cat/1")).toBe(false);
  });

  it("matches deep wildcards", () => {
    expect(matchRoute("/docs/**", "/docs")).toBe(true);
    expect(matchRoute("/docs/**", "/docs/a")).toBe(true);
    expect(matchRoute("/docs/**", "/docs/a/b/c")).toBe(true);
    expect(matchRoute("/docs/**", "/about")).toBe(false);
  });

  it("matches parameters like single wildcards", () => {
    expect(matchRoute("/user/:id", "/user/123")).toBe(true);
    expect(matchRoute("/user/:id", "/user/alice")).toBe(true);
    expect(matchRoute("/user/:id", "/user/")).toBe(false);
    expect(matchRoute("/user/:id", "/user/a/b")).toBe(false);
  });

  it("normalizes trailing slashes on the path", () => {
    expect(matchRoute("/blog/*", "/blog/post/")).toBe(true);
    expect(matchRoute("/about", "/about/")).toBe(true);
  });

  it("matches the root `/`", () => {
    expect(matchRoute("/", "/")).toBe(true);
    expect(matchRoute("/", "/foo")).toBe(false);
  });

  it("bare `**` matches anything", () => {
    expect(matchRoute("**", "/foo")).toBe(true);
    expect(matchRoute("**", "/foo/bar/baz")).toBe(true);
    expect(matchRoute("**", "/")).toBe(true);
  });

  it("bare `*` matches a single-segment path", () => {
    expect(matchRoute("*", "/foo")).toBe(true);
    expect(matchRoute("*", "/foo/bar")).toBe(false);
  });
});

describe("matchRoute — path validation", () => {
  it("rejects empty paths", () => {
    expect(matchRoute("/about", "")).toBe(false);
  });

  it("rejects paths without a leading slash", () => {
    expect(matchRoute("/about", "about")).toBe(false);
  });

  it("returns false for an invalid pattern", () => {
    expect(matchRoute("foo/bar", "/foo/bar")).toBe(false);
  });
});

describe("matchCompiledRoute — hot path", () => {
  it("matches precompiled patterns", () => {
    const segs = compileGlob("/user/:id/posts");
    expect(segs).not.toBeNull();
    if (segs === null) return;
    expect(matchCompiledRoute(segs, "/user/alice/posts")).toBe(true);
    expect(matchCompiledRoute(segs, "/user/alice/comments")).toBe(false);
  });
});
