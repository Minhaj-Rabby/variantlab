import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/_size/config.ts", "src/_size/targeting.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2020",
  treeshake: true,
  splitting: false,
  minify: false,
  outExtension: ({ format }) => ({
    js: format === "cjs" ? ".cjs" : ".js",
  }),
});
