/**
 * Three visual treatments of the home-screen hero card, driven by the
 * `card-layout` experiment. Each one is a drop-in variant that accepts
 * the same props so swapping between them is a zero-data-loss
 * operation at render time.
 *
 * The layouts are intentionally simple — the whole point of having an
 * adapter-level example is to show the wiring, not to win an awards
 * show. A real discovery screen would be considerably more elaborate.
 */
import type { ReactElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface HeroCardProps {
  ctaCopy: string;
}

/** Variant A — a single wide stacked card. The control. */
export function HeroStacked({ ctaCopy }: HeroCardProps): ReactElement {
  return (
    <View style={stacked.card}>
      <Text style={stacked.title}>Daily picks</Text>
      <Text style={stacked.body}>
        A single focused card. The control variant most shops ship with.
      </Text>
      <CallToAction label={ctaCopy} />
    </View>
  );
}

/** Variant B — a 2×2 grid of tiles. */
export function HeroGrid({ ctaCopy }: HeroCardProps): ReactElement {
  return (
    <View>
      <Text style={grid.header}>Today for you</Text>
      <View style={grid.row}>
        <View style={grid.tile}>
          <Text style={grid.tileTitle}>Trending</Text>
          <Text style={grid.tileBody}>Hot picks from the last hour.</Text>
        </View>
        <View style={grid.tile}>
          <Text style={grid.tileTitle}>Near you</Text>
          <Text style={grid.tileBody}>Within 2km of your location.</Text>
        </View>
      </View>
      <View style={grid.row}>
        <View style={grid.tile}>
          <Text style={grid.tileTitle}>New</Text>
          <Text style={grid.tileBody}>Added this week.</Text>
        </View>
        <View style={grid.tile}>
          <Text style={grid.tileTitle}>For you</Text>
          <Text style={grid.tileBody}>Personalized picks.</Text>
        </View>
      </View>
      <CallToAction label={ctaCopy} />
    </View>
  );
}

/** Variant C — a split layout with a tall image on the left. */
export function HeroSplit({ ctaCopy }: HeroCardProps): ReactElement {
  return (
    <View style={split.card}>
      <View style={split.left}>
        <Text style={split.leftLabel}>COVER</Text>
      </View>
      <View style={split.right}>
        <Text style={split.title}>Curated today</Text>
        <Text style={split.body}>
          A 60/40 split — image anchors the left rail, copy floats the right.
        </Text>
        <CallToAction label={ctaCopy} />
      </View>
    </View>
  );
}

function CallToAction({ label }: { label: string }): ReactElement {
  return (
    <Pressable accessibilityRole="button" style={cta.button}>
      <Text style={cta.label}>{label}</Text>
    </Pressable>
  );
}

const stacked = StyleSheet.create({
  card: {
    marginTop: 20,
    padding: 20,
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  body: {
    marginTop: 6,
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 18,
  },
});

const grid = StyleSheet.create({
  header: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  tile: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  tileBody: {
    marginTop: 4,
    fontSize: 11,
    color: "#6b7280",
  },
});

const split = StyleSheet.create({
  card: {
    marginTop: 20,
    flexDirection: "row",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  left: {
    width: 120,
    backgroundColor: "#1f2937",
    alignItems: "center",
    justifyContent: "center",
  },
  leftLabel: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },
  right: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  body: {
    marginTop: 4,
    fontSize: 12,
    color: "#4b5563",
    lineHeight: 16,
  },
});

const cta = StyleSheet.create({
  button: {
    marginTop: 12,
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  label: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 13,
  },
});
