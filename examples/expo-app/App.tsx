/**
 * Expo entrypoint for the variantlab example app.
 *
 * Demonstrates the minimal wiring required to pull a config out of a
 * bundled `experiments.json`, construct a `VariantEngine`, and hand it
 * to `<VariantLabProvider>` so every `useVariant` call downstream
 * resolves against the same engine instance. The `VariantDebugOverlay`
 * from `@variantlab/react-native/debug` mounts on top of the tree so
 * you can inspect and override assignments live on-device.
 *
 * Note on the engine lifetime: we construct it at module scope (not
 * inside a `useMemo`) so hot reload does not throw away in-flight
 * overrides or rebucket the user. Real apps typically move this into
 * its own `src/variantlab.ts` module.
 */
import type { ReactElement } from "react";
import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import { createEngine } from "@variantlab/core";
import { VariantLabProvider } from "@variantlab/react";
import { VariantDebugOverlay } from "@variantlab/react-native/debug";
import experiments from "./experiments.json";
import { HomeScreen } from "./src/HomeScreen.js";

const engine = createEngine(experiments, {
  context: {
    userId: "demo-user",
    platform: "ios",
    appVersion: "1.0.0",
  },
});

export default function App(): ReactElement {
  return (
    <VariantLabProvider engine={engine}>
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="dark-content" />
        <HomeScreen />
      </SafeAreaView>
      {/*
        The debug overlay lives in a separate entrypoint so it is
        tree-shaken out of production bundles unless you opt in.
        `forceEnable` keeps it visible in QA builds.
      */}
      <VariantDebugOverlay position="bottom-right" />
    </VariantLabProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
});
