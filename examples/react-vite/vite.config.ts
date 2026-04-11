import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Minimal Vite config for the example. We lean on the plugin defaults
 * and workspace-linked dependencies so there's nothing framework-
 * specific to explain — a new contributor can open this file and
 * immediately recognize the standard Vite+React setup.
 */
export default defineConfig({
  plugins: [react()],
});
