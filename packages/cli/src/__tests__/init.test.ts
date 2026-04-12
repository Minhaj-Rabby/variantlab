import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { init } from "../commands/init.js";

describe("init command", () => {
  let cwd: string;
  let originalCwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), "variantlab-init-"));
    originalCwd = process.cwd();
    process.chdir(cwd);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(cwd, { recursive: true, force: true });
  });

  it("creates experiments.json in current directory", async () => {
    const code = await init();
    expect(code).toBe(0);

    const content = await readFile(join(cwd, "experiments.json"), "utf-8");
    const config = JSON.parse(content);
    expect(config.version).toBe(1);
    expect(config.experiments).toHaveLength(2);
    expect(config.experiments[0].id).toBe("welcome-message");
    expect(config.experiments[1].id).toBe("hero-layout");
  });

  it("refuses to overwrite without --force", async () => {
    await writeFile(join(cwd, "experiments.json"), "existing", "utf-8");
    const code = await init();
    expect(code).toBe(1);

    const content = await readFile(join(cwd, "experiments.json"), "utf-8");
    expect(content).toBe("existing");
  });

  it("overwrites with --force", async () => {
    await writeFile(join(cwd, "experiments.json"), "existing", "utf-8");
    const code = await init({ force: true });
    expect(code).toBe(0);

    const content = await readFile(join(cwd, "experiments.json"), "utf-8");
    const config = JSON.parse(content);
    expect(config.version).toBe(1);
  });

  it("adds generate script to package.json if present", async () => {
    await writeFile(
      join(cwd, "package.json"),
      JSON.stringify({ name: "test", scripts: {} }),
      "utf-8",
    );
    const code = await init();
    expect(code).toBe(0);

    const pkg = JSON.parse(await readFile(join(cwd, "package.json"), "utf-8"));
    expect(pkg.scripts["variantlab:generate"]).toBe("variantlab generate");
  });

  it("does not duplicate generate script if already present", async () => {
    await writeFile(
      join(cwd, "package.json"),
      JSON.stringify({
        name: "test",
        scripts: { "variantlab:generate": "custom" },
      }),
      "utf-8",
    );
    const code = await init();
    expect(code).toBe(0);

    const pkg = JSON.parse(await readFile(join(cwd, "package.json"), "utf-8"));
    expect(pkg.scripts["variantlab:generate"]).toBe("custom");
  });
});
