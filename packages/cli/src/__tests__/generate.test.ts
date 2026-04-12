import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generate } from "../commands/generate.js";

const VALID_CONFIG = JSON.stringify({
  version: 1,
  experiments: [
    {
      id: "cta-copy",
      name: "CTA button copy",
      type: "value",
      default: "buy-now",
      variants: [
        { id: "buy-now", label: "Buy Now", value: "Buy now" },
        { id: "get-started", label: "Get Started", value: "Get started" },
      ],
    },
    {
      id: "hero-layout",
      name: "Hero section layout",
      type: "render",
      default: "centered",
      variants: [
        { id: "centered", label: "Centered" },
        { id: "split", label: "Split view" },
      ],
    },
  ],
});

describe("generate command", () => {
  let cwd: string;
  let originalCwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), "variantlab-gen-"));
    originalCwd = process.cwd();
    process.chdir(cwd);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(cwd, { recursive: true, force: true });
  });

  it("generates TypeScript from a valid config", async () => {
    await writeFile(join(cwd, "experiments.json"), VALID_CONFIG, "utf-8");
    await mkdir(join(cwd, "src"), { recursive: true });

    const code = await generate();
    expect(code).toBe(0);

    const output = await readFile(join(cwd, "src/variantlab.generated.ts"), "utf-8");
    expect(output).toContain("AUTO-GENERATED");
    expect(output).toContain("DO NOT EDIT BY HAND");
    expect(output).toContain("VariantLabExperiments");
    expect(output).toContain('"cta-copy"');
    expect(output).toContain('"hero-layout"');
    expect(output).toContain('"buy-now" | "get-started"');
    expect(output).toContain('"centered" | "split"');
    expect(output).toContain('type: "value"');
    expect(output).toContain('type: "render"');
    expect(output).toContain('value: "Buy now" | "Get started"');
    expect(output).toContain("VariantLabRegistry");
    expect(output).toContain("ExperimentId");
    expect(output).toContain("VariantId");
    expect(output).toContain("VariantValueType");
  });

  it("uses custom config and output paths", async () => {
    const configDir = join(cwd, "config");
    const outDir = join(cwd, "types");
    await mkdir(configDir, { recursive: true });
    await mkdir(outDir, { recursive: true });
    await writeFile(join(configDir, "exp.json"), VALID_CONFIG, "utf-8");

    const code = await generate({
      config: join(configDir, "exp.json"),
      out: join(outDir, "generated.ts"),
    });
    expect(code).toBe(0);

    const output = await readFile(join(outDir, "generated.ts"), "utf-8");
    expect(output).toContain("VariantLabExperiments");
  });

  it("returns 1 when config not found", async () => {
    const code = await generate({ config: "nonexistent.json" });
    expect(code).toBe(1);
  });

  it("returns 2 for invalid JSON", async () => {
    await writeFile(join(cwd, "experiments.json"), "not json {{{", "utf-8");
    const code = await generate();
    expect(code).toBe(2);
  });

  it("returns 2 for invalid config schema", async () => {
    await writeFile(join(cwd, "experiments.json"), JSON.stringify({ version: 999 }), "utf-8");
    const code = await generate();
    expect(code).toBe(2);
  });

  it("generates correct value types for mixed values", async () => {
    const config = JSON.stringify({
      version: 1,
      experiments: [
        {
          id: "num-exp",
          name: "Number experiment",
          type: "value",
          default: "a",
          variants: [
            { id: "a", value: 42 },
            { id: "b", value: 100 },
          ],
        },
      ],
    });
    await writeFile(join(cwd, "experiments.json"), config, "utf-8");
    await mkdir(join(cwd, "src"), { recursive: true });

    const code = await generate();
    expect(code).toBe(0);

    const output = await readFile(join(cwd, "src/variantlab.generated.ts"), "utf-8");
    expect(output).toContain("value: 42 | 100");
  });

  it("generates JSDoc comments from experiment names", async () => {
    await writeFile(join(cwd, "experiments.json"), VALID_CONFIG, "utf-8");
    await mkdir(join(cwd, "src"), { recursive: true });

    const code = await generate();
    expect(code).toBe(0);

    const output = await readFile(join(cwd, "src/variantlab.generated.ts"), "utf-8");
    expect(output).toContain("/** CTA button copy */");
    expect(output).toContain("/** Hero section layout */");
  });
});
