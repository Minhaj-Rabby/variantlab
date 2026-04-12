import { resolve } from "node:path";
import { fileExists, readTextFile, writeTextFile } from "../utils/file.js";
import * as print from "../utils/printer.js";

const STARTER_CONFIG = `{
  "$schema": "https://variantlab.dev/schemas/experiments.schema.json",
  "version": 1,
  "experiments": [
    {
      "id": "welcome-message",
      "name": "Welcome message copy",
      "type": "value",
      "default": "hello",
      "variants": [
        { "id": "hello", "label": "Hello", "value": "Hello, welcome!" },
        { "id": "hey", "label": "Hey", "value": "Hey there, glad you're here!" }
      ]
    },
    {
      "id": "hero-layout",
      "name": "Hero section layout",
      "type": "render",
      "default": "centered",
      "variants": [
        { "id": "centered", "label": "Centered" },
        { "id": "split", "label": "Split view" }
      ]
    }
  ]
}
`;

export interface InitOptions {
  readonly force?: boolean | undefined;
  readonly verbose?: boolean | undefined;
}

export async function init(options: InitOptions = {}): Promise<number> {
  const configPath = resolve("experiments.json");

  if (!options.force && (await fileExists(configPath))) {
    print.error("experiments.json already exists. Use --force to overwrite.");
    return 1;
  }

  try {
    await writeTextFile(configPath, STARTER_CONFIG);
    print.success("Created experiments.json");
  } catch (err) {
    print.error(`Failed to write experiments.json: ${(err as Error).message}`);
    return 3;
  }

  // Try to add generate script to package.json if it exists
  const pkgPath = resolve("package.json");
  if (await fileExists(pkgPath)) {
    try {
      const raw = await readTextFile(pkgPath);
      const pkg = JSON.parse(raw) as Record<string, unknown>;
      const scripts = (pkg.scripts ?? {}) as Record<string, string>;
      if (!scripts["variantlab:generate"]) {
        scripts["variantlab:generate"] = "variantlab generate";
        pkg.scripts = scripts;
        await writeTextFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
        print.success('Added "variantlab:generate" script to package.json');
      }
    } catch {
      print.verbose("Could not update package.json (non-fatal)", true);
    }
  }

  console.log("");
  print.info("Next steps:");
  console.log("  1. Edit experiments.json to define your experiments");
  console.log("  2. Run: variantlab generate");
  console.log("  3. Import the generated types in your app");
  console.log("");

  return 0;
}
