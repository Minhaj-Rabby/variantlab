/**
 * Vitest setup for `@variantlab/react-native`.
 *
 * Unit tests run in a plain Node environment (see `vitest.config.ts`)
 * with `react-native` replaced by a pure-JS stub. Two things make
 * this necessary:
 *
 *   1. Real `react-native` tries to bind native modules at import
 *      time. Any `import ... from "react-native"` in a source file
 *      would crash the test runner on load.
 *   2. We render the overlay using `react-dom/server.renderToStaticMarkup`
 *      because (a) it works in plain Node without jsdom, (b) it runs
 *      hooks end-to-end, and (c) `react-test-renderer` is broken for
 *      host elements in React 19. `react-dom/server` is unhappy with
 *      non-DOM props like `onPress` / `accessibilityRole` / style
 *      arrays, so the `react-native` stubs below render their
 *      children inside a `<React.Fragment>` and drop every prop on
 *      the floor. Text nodes bubble up through the tree unchanged,
 *      which is all the snapshot assertions actually need.
 *
 * The mock is placed in a Vitest `setupFiles` entry so it applies
 * globally before any test file is evaluated.
 */

import * as React from "react";
import { vi } from "vitest";

(globalThis as { __DEV__?: boolean }).__DEV__ = true;

vi.mock("react-native", () => {
  /**
   * Build a React component that discards its props and renders its
   * children inside a `React.Fragment`. Perfect for snapshot-style
   * tests that only care about text nodes.
   */
  const makePassthrough = (displayName: string) => {
    const Component: React.FC<{ children?: React.ReactNode }> = (props) =>
      React.createElement(React.Fragment, null, props.children);
    Component.displayName = displayName;
    return Component;
  };

  const View = makePassthrough("View");
  const Text = makePassthrough("Text");
  const ScrollView = makePassthrough("ScrollView");
  const Pressable = makePassthrough("Pressable");
  const TextInput = makePassthrough("TextInput");

  const Modal: React.FC<{ visible?: boolean; children?: React.ReactNode }> = (props) =>
    props.visible === false ? null : React.createElement(React.Fragment, null, props.children);
  Modal.displayName = "Modal";

  class AnimatedValue {
    constructor(_value: number) {}
    setValue(_value: number): void {}
    interpolate(_config: unknown): AnimatedValue {
      return this;
    }
  }

  const Animated = {
    Value: AnimatedValue,
    View: makePassthrough("Animated.View"),
    Text: makePassthrough("Animated.Text"),
    ScrollView: makePassthrough("Animated.ScrollView"),
    timing: (_value: AnimatedValue, _config: unknown) => ({
      start: (cb?: (r: { finished: boolean }) => void) => cb?.({ finished: true }),
      stop: () => {},
    }),
    parallel: (animations: Array<{ start: (cb?: () => void) => void }>) => ({
      start: (cb?: (r: { finished: boolean }) => void) => {
        for (const a of animations) a.start();
        cb?.({ finished: true });
      },
      stop: () => {},
    }),
  };

  const StyleSheet = {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
    flatten: <T>(style: T): T => style,
    absoluteFill: 0,
    absoluteFillObject: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    hairlineWidth: 1,
  };

  const Platform = {
    OS: "ios" as const,
    Version: "17.0",
    select: <T>(specifics: { ios?: T; android?: T; default?: T }): T | undefined =>
      specifics.ios ?? specifics.default,
  };

  const Dimensions = {
    get: (_dim: "window" | "screen") => ({
      width: 390,
      height: 844,
      scale: 3,
      fontScale: 1,
    }),
    addEventListener: () => ({ remove: () => {} }),
  };

  const Linking = {
    addEventListener: () => ({ remove: () => {} }),
    getInitialURL: async () => null,
    openURL: async () => {},
    canOpenURL: async () => true,
  };

  const NativeModules: Record<string, unknown> = {};
  const I18nManager = { isRTL: false };
  const AppState = {
    currentState: "active" as const,
    addEventListener: () => ({ remove: () => {} }),
  };

  return {
    View,
    Text,
    ScrollView,
    Pressable,
    TextInput,
    Modal,
    Animated,
    StyleSheet,
    Platform,
    Dimensions,
    Linking,
    NativeModules,
    I18nManager,
    AppState,
  };
});
