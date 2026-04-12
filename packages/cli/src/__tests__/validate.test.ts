import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validate } from "../commands/validate.js";

const VALID_CONFIG = JSON.stringify({
  version: 1,
  experiments: [
    {
      id: "test-exp",
      name: "Test experiment",
      default: "a",
      variants: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
    },
  ],
});

describe("validate command", () => {
  let cwd: string;
  let originalCwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), "variantlab-val-"));
    originalCwd = process.cwd();
    process.chdir(cwd);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(cwd, { recursive: true, force: true });
  });

  it("returns 0 for a valid config", async () => {
    await writeFile(join(cwd, "experiments.json"), VALID_CONFIG, "utf-8");
    const code = await validate();
    expect(code).toBe(0);
  });

  it("returns 1 when config not found", async () => {
    const code = await validate("nonexistent.json");
    expect(code).toBe(1);
  });

  it("returns 2 for invalid JSON", async () => {
    await writeFile(join(cwd, "bad.json"), "{not json", "utf-8");
    const code = await validate(join(cwd, "bad.json"));
    expect(code).toBe(2);
  });

  it("returns 2 for schema violations", async () => {
    const invalid = JSON.stringify({
      version: 1,
      experiments: [
        {
          id: "UPPERCASE",
          name: "Bad ID",
          default: "a",
          variants: [{ id: "a" }, { id: "b" }],
        },
      ],
    });
    await writeFile(join(cwd, "experiments.json"), invalid, "utf-8");
    const code = await validate();
    expect(code).toBe(2);
  });

  it("returns 2 for missing version", async () => {
    await writeFile(
      join(cwd, "experiments.json"),
      JSON.stringify({ experiments: [] }),
      "utf-8",
    );
    const code = await validate();
    expect(code).toBe(2);
  });

  it("validates a custom path positional argument", async () => {
    const customPath = join(cwd, "custom.json");
    await writeFile(customPath, VALID_CONFIG, "utf-8");
    const code = await validate(customPath);
    expect(code).toBe(0);
  });

  it("returns 2 for duplicate experiment ids", async () => {
    const dupes = JSON.stringify({
      version: 1,
      experiments: [
        { id: "exp-a", name: "A", default: "x", variants: [{ id: "x" }, { id: "y" }] },
        { id: "exp-a", name: "A dup", default: "x", variants: [{ id: "x" }, { id: "y" }] },
      ],
    });
    await writeFile(join(cwd, "experiments.json"), dupes, "utf-8");
    const code = await validate();
    expect(code).toBe(2);
  });

  it("returns 2 when default does not match a variant id", async () => {
    const bad = JSON.stringify({
      version: 1,
      experiments: [
        {
          id: "test-exp",
          name: "Test",
          default: "missing",
          variants: [{ id: "a" }, { id: "b" }],
        },
      ],
    });
    await writeFile(join(cwd, "experiments.json"), bad, "utf-8");
    const code = await validate();
    expect(code).toBe(2);
  });
});
