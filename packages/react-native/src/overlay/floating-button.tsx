/**
 * The floating debug button.
 *
 * A 48×48 circular Pressable absolute-positioned in one of the four
 * screen corners. Renders a badge with the count of route-scoped
 * experiments so users see at a glance how many things they can
 * tweak on the current screen.
 *
 * Implementation notes:
 *
 *   - We avoid `react-native-svg` and inline icons by drawing a
 *     simple beaker glyph with a couple of `<View>` rectangles. The
 *     icon is recognisable enough at 24px, costs nothing in bundle
 *     size, and removes a peer dependency.
 *   - The badge collapses when there are zero experiments — showing
 *     `0` is more confusing than no badge at all.
 *   - The component does not subscribe to engine events itself; the
 *     parent passes `count` so a single subscription drives the whole
 *     overlay.
 */
import type { ReactElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { OverlayTheme } from "./theme.js";

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface FloatingButtonProps {
  theme: OverlayTheme;
  corner: Corner;
  offset: { x: number; y: number };
  count: number;
  onPress: () => void;
}

export function FloatingButton({
  theme,
  corner,
  offset,
  count,
  onPress,
}: FloatingButtonProps): ReactElement {
  const positionStyle = cornerStyle(corner, offset);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open variantlab debug overlay"
      onPress={onPress}
      style={[styles.button, positionStyle, { backgroundColor: theme.accent }]}
      hitSlop={8}
      testID="variantlab-floating-button"
    >
      <BeakerIcon color={theme.accentText} />
      {count > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
          <Text style={[styles.badgeText, { color: theme.text }]}>{String(count)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function BeakerIcon({ color }: { color: string }): ReactElement {
  return (
    <View style={styles.iconWrap}>
      <View style={[styles.iconNeck, { backgroundColor: color }]} />
      <View style={[styles.iconBody, { borderColor: color }]} />
    </View>
  );
}

function cornerStyle(corner: Corner, offset: { x: number; y: number }): Record<string, number> {
  switch (corner) {
    case "top-left":
      return { top: offset.y, left: offset.x };
    case "top-right":
      return { top: offset.y, right: offset.x };
    case "bottom-left":
      return { bottom: offset.y, left: offset.x };
    case "bottom-right":
      return { bottom: offset.y, right: offset.x };
  }
}

const styles = StyleSheet.create({
  button: {
    position: "absolute" as unknown as undefined,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  badge: {
    position: "absolute" as unknown as undefined,
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  iconWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  iconNeck: {
    width: 4,
    height: 6,
    marginBottom: 0,
  },
  iconBody: {
    width: 18,
    height: 14,
    borderWidth: 2,
    borderRadius: 3,
    borderTopWidth: 0,
  },
});
