import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

const r = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

/**
 * Workspace-package aliases, applied to every project.
 *
 * The CI `test` job has `needs: install` — not `needs: build` — so when
 * vitest starts, `packages/*\/dist` doesn't exist yet and vite's default
 * resolver would follow each package's `exports` field into a file that
 * isn't there. Aliasing to source matches the pattern the example
 * tsconfigs use (`paths`) and keeps the test run independent of the build.
 *
 * Each project in `test.projects` spins up its own vite instance with its
 * own `root:`, and does **not** inherit root-level `resolve` from the
 * parent `defineConfig`. That's why the aliases are duplicated into every
 * project via `resolve.alias`.
 *
 * Subpath aliases must come before bare-package aliases or the bare
 * pattern would swallow `@variantlab/react-native/debug`.
 */
const workspaceAliases = [
  {
    find: /^@variantlab\/react-native\/debug$/,
    replacement: r("./packages/react-native/src/debug.ts"),
  },
  {
    find: /^@variantlab\/react-native\/qr$/,
    replacement: r("./packages/react-native/src/qr.ts"),
  },
  { find: /^@variantlab\/core$/, replacement: r("./packages/core/src/index.ts") },
  { find: /^@variantlab\/react$/, replacement: r("./packages/react/src/index.ts") },
  {
    find: /^@variantlab\/react-native$/,
    replacement: r("./packages/react-native/src/index.ts"),
  },
  { find: /^@variantlab\/next$/, replacement: r("./packages/next/src/index.ts") },
  { find: /^@variantlab\/cli$/, replacement: r("./packages/cli/src/index.ts") },
];

export default defineConfig({
  resolve: { alias: workspaceAliases },
  test: {
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      include: [
        "packages/core/src/config/**/*.ts",
        "packages/core/src/targeting/**/*.ts",
        "packages/core/src/assignment/**/*.ts",
        "packages/core/src/history/**/*.ts",
        "packages/core/src/engine/**/*.ts",
        "packages/react/src/**/*.{ts,tsx}",
      ],
      exclude: [
        "packages/core/src/config/**/*.test.ts",
        "packages/core/src/config/__tests__/**",
        "packages/core/src/config/codes.ts",
        "packages/core/src/config/types.ts",
        "packages/core/src/targeting/**/*.test.ts",
        "packages/core/src/targeting/__tests__/**",
        "packages/core/src/targeting/types.ts",
        "packages/core/src/assignment/**/*.test.ts",
        "packages/core/src/assignment/__tests__/**",
        "packages/core/src/history/**/*.test.ts",
        "packages/core/src/history/__tests__/**",
        "packages/core/src/history/events.ts",
        "packages/core/src/engine/**/*.test.ts",
        "packages/core/src/engine/__tests__/**",
        "packages/core/src/_size/**",
        "packages/react/src/**/*.test.{ts,tsx}",
        "packages/react/src/__tests__/**",
        "packages/react/src/index.ts",
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        statements: 95,
        branches: 90,
      },
      reporter: ["text", "html"],
    },
    projects: [
      {
        resolve: { alias: workspaceAliases },
        test: {
          name: "core",
          root: "./packages/core",
          include: ["src/**/*.test.ts"],
          environment: "node",
          passWithNoTests: true,
        },
      },
      {
        resolve: { alias: workspaceAliases },
        test: {
          name: "react",
          root: "./packages/react",
          include: ["src/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["./src/__tests__/setup.ts"],
          passWithNoTests: true,
        },
      },
      {
        resolve: { alias: workspaceAliases },
        test: {
          name: "react-native",
          root: "./packages/react-native",
          include: ["src/**/*.test.{ts,tsx}"],
          environment: "node",
          setupFiles: ["./src/__tests__/setup.ts"],
          passWithNoTests: true,
        },
      },
      {
        resolve: { alias: workspaceAliases },
        test: {
          name: "next",
          root: "./packages/next",
          include: ["src/**/*.test.{ts,tsx}"],
          environment: "node",
          passWithNoTests: true,
        },
      },
      {
        resolve: { alias: workspaceAliases },
        test: {
          name: "cli",
          root: "./packages/cli",
          include: ["src/**/*.test.ts"],
          environment: "node",
          passWithNoTests: true,
        },
      },
    ],
  },
});
