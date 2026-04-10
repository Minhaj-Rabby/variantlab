import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      include: ["packages/core/src/config/**/*.ts", "packages/core/src/targeting/**/*.ts"],
      exclude: [
        "packages/core/src/config/**/*.test.ts",
        "packages/core/src/config/__tests__/**",
        "packages/core/src/config/codes.ts",
        "packages/core/src/config/types.ts",
        "packages/core/src/targeting/**/*.test.ts",
        "packages/core/src/targeting/__tests__/**",
        "packages/core/src/targeting/types.ts",
        "packages/core/src/_size/**",
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
        test: {
          name: "core",
          root: "./packages/core",
          include: ["src/**/*.test.ts"],
          environment: "node",
          passWithNoTests: true,
        },
      },
      {
        test: {
          name: "react",
          root: "./packages/react",
          include: ["src/**/*.test.{ts,tsx}"],
          environment: "node",
          passWithNoTests: true,
        },
      },
      {
        test: {
          name: "react-native",
          root: "./packages/react-native",
          include: ["src/**/*.test.{ts,tsx}"],
          environment: "node",
          passWithNoTests: true,
        },
      },
      {
        test: {
          name: "next",
          root: "./packages/next",
          include: ["src/**/*.test.{ts,tsx}"],
          environment: "node",
          passWithNoTests: true,
        },
      },
      {
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
