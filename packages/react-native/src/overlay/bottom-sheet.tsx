/**
 * Hand-rolled bottom sheet.
 *
 * Wraps the content in `<Modal>` (so it floats above the host app's
 * navigation stack) and animates in via `Animated.timing` on a value
 * representing the slide-up progress (0 = off-screen, 1 = fully open).
 *
 * We avoid `react-native-bottom-sheet` and similar third-party libs
 * because:
 *
 *   1. They are huge — typical bottom-sheet libs ship 30+ KB minified.
 *   2. They depend on `react-native-reanimated` and `react-native-gesture-handler`,
 *      which we cannot reasonably make peer deps without forcing every
 *      Expo user to install them.
 *   3. Our needs are tiny: tap to dismiss, fixed max height, no drag.
 *
 * Animation honours `prefers-reduced-motion` by collapsing the slide
 * to an instant fade — but RN doesn't expose a stable hook for that
 * preference, so we conservatively skip it for now and revisit when
 * `AccessibilityInfo.isReduceMotionEnabled()` is wired in (Phase 2).
 */
import { type ReactElement, type ReactNode, useEffect, useRef } from "react";
import { Animated, Modal, Pressable, StyleSheet, View } from "react-native";
import type { OverlayTheme } from "./theme.js";

export interface BottomSheetProps {
  visible: boolean;
  onRequestClose: () => void;
  theme: OverlayTheme;
  insetBottom?: number;
  children: ReactNode;
}

export function BottomSheet({
  visible,
  onRequestClose,
  theme,
  insetBottom = 0,
  children,
}: BottomSheetProps): ReactElement {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <View style={styles.root} pointerEvents="box-none">
        <Animated.View style={[styles.scrim, { opacity }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss debug overlay"
            onPress={onRequestClose}
            style={StyleSheet.absoluteFill}
            testID="variantlab-scrim"
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              paddingBottom: insetBottom + 12,
              transform: [{ translateY }],
            },
          ]}
          testID="variantlab-bottom-sheet"
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: "85%" as unknown as number,
  },
});
