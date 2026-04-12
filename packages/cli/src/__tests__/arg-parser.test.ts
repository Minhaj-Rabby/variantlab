import { describe, it, expect } from "vitest";
import { parseArgs } from "../utils/arg-parser.js";

describe("parseArgs", () => {
  it("parses a command", () => {
    const result = parseArgs(["init"]);
    expect(result.command).toBe("init");
    expect(result.positionals).toEqual([]);
    expect(result.flags).toEqual({});
  });

  it("parses --flag as boolean true", () => {
    const result = parseArgs(["init", "--force"]);
    expect(result.flags.force).toBe(true);
  });

  it("parses --flag=value", () => {
    const result = parseArgs(["generate", "--config=./path.json"]);
    expect(result.flags.config).toBe("./path.json");
  });

  it("parses --flag value", () => {
    const result = parseArgs(["generate", "--config", "./path.json"]);
    expect(result.flags.config).toBe("./path.json");
  });

  it("parses --no-flag as boolean false", () => {
    const result = parseArgs(["--no-color"]);
    expect(result.flags.color).toBe(false);
  });

  it("converts kebab-case to camelCase", () => {
    const result = parseArgs(["eval", "--context-file", "ctx.json"]);
    expect(result.flags.contextFile).toBe("ctx.json");
  });

  it("collects positionals after command", () => {
    const result = parseArgs(["validate", "path/to/config.json"]);
    expect(result.command).toBe("validate");
    expect(result.positionals).toEqual(["path/to/config.json"]);
  });

  it("treats -- as end of flags", () => {
    const result = parseArgs(["init", "--", "--not-a-flag"]);
    expect(result.command).toBe("init");
    expect(result.positionals).toEqual(["--not-a-flag"]);
    expect(result.flags).toEqual({});
  });

  it("handles short flags with value", () => {
    const result = parseArgs(["-c", "config.json"]);
    expect(result.flags.c).toBe("config.json");
  });

  it("handles short flags as boolean", () => {
    const result = parseArgs(["-v"]);
    expect(result.flags.v).toBe(true);
  });

  it("handles empty argv", () => {
    const result = parseArgs([]);
    expect(result.command).toBeUndefined();
    expect(result.positionals).toEqual([]);
    expect(result.flags).toEqual({});
  });

  it("handles multiple flags together", () => {
    const result = parseArgs([
      "generate",
      "--config",
      "./exp.json",
      "--out",
      "./types.ts",
      "--watch",
      "--verbose",
    ]);
    expect(result.command).toBe("generate");
    expect(result.flags.config).toBe("./exp.json");
    expect(result.flags.out).toBe("./types.ts");
    expect(result.flags.watch).toBe(true);
    expect(result.flags.verbose).toBe(true);
  });

  it("does not confuse flag-value starting with dash for a flag", () => {
    // --flag followed by another --flag means first is boolean
    const result = parseArgs(["--verbose", "--force"]);
    expect(result.flags.verbose).toBe(true);
    expect(result.flags.force).toBe(true);
  });
});
