import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/debug.ts", "src/qr.ts"],
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
    "react-native",
    "@react-native-async-storage/async-storage",
    "react-native-mmkv",
    "expo-secure-store",
    "expo-localization",
    "expo-constants",
    "react-native-safe-area-context",
    "react-native-svg",
  ],
  outExtension: ({ format }) => ({
    js: format === "cjs" ? ".cjs" : ".js",
  }),
});
