/**
 * Vite entrypoint for the example app.
 *
 * Constructs a single `VariantEngine` outside of React so it survives
 * component re-mounts and hot reloads cleanly, then hands it to the
 * provider. In a real app you'd typically put this in its own module
 * (e.g. `src/variantlab.ts`) so tests and SSR can import it without
 * pulling in React.
 */
import { createEngine } from "@variantlab/core";
import { VariantLabProvider } from "@variantlab/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import experiments from "../experiments.json";

const engine = createEngine(experiments, {
  context: { userId: "demo-user", platform: "web" },
});

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <StrictMode>
    <VariantLabProvider engine={engine}>
      <App />
    </VariantLabProvider>
  </StrictMode>,
);
