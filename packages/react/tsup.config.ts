import { defineConfig } from "tsup";

const shared = {
  format: ["esm", "cjs"] as const,
  dts: true,
  sourcemap: true,
  target: "es2020" as const,
  treeshake: true,
  splitting: false,
  minify: false,
  outExtension: ({ format }: { format: string }) => ({
    js: format === "cjs" ? ".cjs" : ".js",
  }),
};

export default defineConfig([
  {
    ...shared,
    entry: ["src/index.ts"],
    clean: true,
  },
  {
    ...shared,
    entry: ["src/debug.ts"],
    clean: false,
    // Externalize the main entry so the debug bundle imports the context
    // singleton from index.js at runtime instead of inlining its own copy.
    external: ["@variantlab/react"],
  },
]);
