import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evalCommand } from "../commands/eval.js";

const CONFIG = JSON.stringify({
  version: 1,
  experiments: [
    {
      id: "platform-test",
      name: "Platform targeting test",
      type: "render",
      default: "fallback",
      targeting: {
        platform: ["ios"],
      },
      variants: [
        { id: "fallback", label: "Fallback" },
        { id: "native", label: "Native" },
      ],
    },
    {
      id: "simple-exp",
      name: "Simple experiment",
      default: "a",
      variants: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
    },
    {
      id: "value-exp",
      name: "Value experiment",
      type: "value",
      default: "opt-a",
      variants: [
        { id: "opt-a", value: "Option A" },
        { id: "opt-b", value: "Option B" },
      ],
    },
  ],
});

describe("eval command", () => {
  let cwd: string;
  let originalCwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), "variantlab-eval-"));
    originalCwd = process.cwd();
    process.chdir(cwd);
    await writeFile(join(cwd, "experiments.json"), CONFIG, "utf-8");
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(cwd, { recursive: true, force: true });
  });

  it("returns 4 when --experiment is missing", async () => {
    const code = await evalCommand();
    expect(code).toBe(4);
  });

  it("returns 1 when config not found", async () => {
    const code = await evalCommand("nonexistent.json", {
      experiment: "simple-exp",
    });
    expect(code).toBe(1);
  });

  it("returns 4 when experiment not found", async () => {
    const code = await evalCommand(undefined, {
      experiment: "no-such-experiment",
    });
    expect(code).toBe(4);
  });

  it("evaluates a simple experiment with no targeting", async () => {
    const code = await evalCommand(undefined, {
      experiment: "simple-exp",
    });
    expect(code).toBe(0);
  });

  it("evaluates with inline context", async () => {
    const code = await evalCommand(undefined, {
      experiment: "platform-test",
      context: '{"platform":"ios"}',
    });
    expect(code).toBe(0);
  });

  it("evaluates with context file", async () => {
    const ctxPath = join(cwd, "context.json");
    await writeFile(ctxPath, '{"platform":"android"}', "utf-8");
    const code = await evalCommand(undefined, {
      experiment: "platform-test",
      contextFile: ctxPath,
    });
    expect(code).toBe(0);
  });

  it("returns 4 for invalid inline context JSON", async () => {
    const code = await evalCommand(undefined, {
      experiment: "simple-exp",
      context: "not-json",
    });
    expect(code).toBe(4);
  });

  it("returns 3 for non-existent context file", async () => {
    const code = await evalCommand(undefined, {
      experiment: "simple-exp",
      contextFile: "no-such-file.json",
    });
    expect(code).toBe(3);
  });

  it("evaluates a value experiment", async () => {
    const code = await evalCommand(undefined, {
      experiment: "value-exp",
    });
    expect(code).toBe(0);
  });
});
