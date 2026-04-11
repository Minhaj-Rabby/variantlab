/**
 * Home screen showcasing the three ways variantlab exposes an
 * experiment in React/React Native code:
 *
 *   1. `<Variant>`        — render-prop component swap, perfect for
 *      layout A/B/C tests like `card-layout`.
 *   2. `useVariantValue`  — typed value pull, used for the CTA text
 *      and the price badge chip.
 *   3. `useSetVariant`    — imperative override for the "cycle layout"
 *      button, so designers can flip variants from the device without
 *      opening the overlay.
 *
 * The overall vibe is intentionally "Drishtikon-ish" — a dense
 * discovery home screen where every pixel is worth experimenting on.
 */
import type { ReactElement } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Variant,
  useSetVariant,
  useVariant,
  useVariantValue,
} from "@variantlab/react";
import { HeroStacked, HeroGrid, HeroSplit } from "./HeroCard.js";

type LayoutId = "stacked" | "grid" | "split";
const LAYOUT_ORDER: readonly LayoutId[] = ["stacked", "grid", "split"];

function isLayoutId(value: string): value is LayoutId {
  return value === "stacked" || value === "grid" || value === "split";
}

export function HomeScreen(): ReactElement {
  const layoutRaw = useVariant("card-layout");
  const layout: LayoutId = isLayoutId(layoutRaw) ? layoutRaw : "stacked";
  const ctaCopy = useVariantValue<string>("cta-copy");
  const priceBadge = useVariantValue<string>("price-badge");
  const setVariant = useSetVariant();

  const nextLayout = (): void => {
    const idx = LAYOUT_ORDER.indexOf(layout);
    const next = LAYOUT_ORDER[(idx + 1) % LAYOUT_ORDER.length] ?? "stacked";
    setVariant("card-layout", next);
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>variantlab · Expo example</Text>
      <Text style={styles.subtitle}>
        Current layout variant: <Text style={styles.bold}>{layout}</Text>
      </Text>

      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{priceBadge}</Text>
        </View>
      </View>

      <Variant experimentId="card-layout">
        {{
          stacked: <HeroStacked ctaCopy={ctaCopy} />,
          grid: <HeroGrid ctaCopy={ctaCopy} />,
          split: <HeroSplit ctaCopy={ctaCopy} />,
        }}
      </Variant>

      <Pressable
        accessibilityRole="button"
        onPress={nextLayout}
        style={({ pressed }) => [
          styles.cycleButton,
          pressed ? styles.cycleButtonPressed : null,
        ]}
      >
        <Text style={styles.cycleButtonText}>Cycle layout variant</Text>
      </Pressable>

      <Text style={styles.hint}>
        Tap the flask in the bottom-right to open the variantlab debug overlay
        and inspect every active experiment, context key, and recent event.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 120,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 6,
  },
  bold: {
    fontWeight: "700",
    color: "#111827",
  },
  badgeRow: {
    flexDirection: "row",
    marginTop: 16,
  },
  badge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400e",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  cycleButton: {
    marginTop: 24,
    backgroundColor: "#111827",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  cycleButtonPressed: {
    backgroundColor: "#374151",
  },
  cycleButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15,
  },
  hint: {
    marginTop: 24,
    fontSize: 12,
    color: "#9ca3af",
    lineHeight: 18,
  },
});
