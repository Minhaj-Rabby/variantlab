import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
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
