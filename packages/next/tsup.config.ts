import { readFile, writeFile } from "node:fs/promises";
import { defineConfig } from "tsup";

/**
 * The Next adapter ships two artifact sets: a plain server bundle and
 * a Client Component bundle for `@variantlab/next/client`. The client
 * bundle must have the `"use client"` directive on the very first line
 * so Next's bundler treats it as a Client Boundary.
 *
 * Rollup (which tsup uses under the hood) strips module-level string
 * directives by design — the `banner` option emits the banner BEFORE
 * any imports, but rollup still hoists imports above it. The only
 * reliable way to keep the directive on line 1 of the final file is to
 * write it in a post-build hook.
 */
async function prependUseClient(): Promise<void> {
  const files = ["dist/client/hooks.js", "dist/client/hooks.cjs"];
  for (const file of files) {
    try {
      const contents = await readFile(file, "utf8");
      if (contents.startsWith('"use client"') || contents.startsWith("'use client'")) continue;
      await writeFile(file, `"use client";\n${contents}`);
    } catch {
      // File may not exist on partial builds — safe to skip.
    }
  }
}

export default defineConfig([
  {
    name: "server",
    entry: {
      index: "src/index.ts",
      "app-router": "src/app-router.ts",
      "pages-router": "src/pages-router.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "es2020",
    treeshake: true,
    splitting: false,
    minify: false,
    external: [
      "react",
      "react-dom",
      "next",
      "next/navigation",
      "next/headers",
      "next/server",
      "@variantlab/core",
      "@variantlab/react",
    ],
    outExtension: ({ format }) => ({
      js: format === "cjs" ? ".cjs" : ".js",
    }),
  },
  {
    name: "client",
    entry: {
      "client/hooks": "src/client/hooks.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: false,
    target: "es2020",
    treeshake: true,
    splitting: false,
    minify: false,
    // NOTE: `@variantlab/react` is intentionally bundled (via
    // `noExternal`) so Next's client-reference loader finds concrete
    // local bindings for `Variant`, `useVariantValue`, etc. in a single
    // atomic `.cjs` module, rather than chasing `require('@variantlab/react')`
    // across package boundaries.
    external: [
      "react",
      "react-dom",
      "next",
      "next/navigation",
      "next/headers",
      "next/server",
      "@variantlab/core",
    ],
    noExternal: ["@variantlab/react"],
    outExtension: ({ format }) => ({
      js: format === "cjs" ? ".cjs" : ".js",
    }),
    async onSuccess() {
      await prependUseClient();
    },
  },
]);
