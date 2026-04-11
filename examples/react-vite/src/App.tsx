/**
 * Example app demonstrating the three main `@variantlab/react` patterns:
 *
 *   1. `useVariant`        — read the variant id and switch on it.
 *   2. `<Variant>`         — render-prop for component swaps.
 *   3. `useVariantValue`   — pull a typed value for "value" experiments.
 *
 * A "Reassign" button calls `engine.setVariant` via `useSetVariant` so
 * you can see hooks reactively re-render as the engine state changes —
 * the same machinery that powers the debug overlay in other adapters.
 */
import { useSetVariant, useVariant, useVariantValue, Variant } from "@variantlab/react";
import type { CSSProperties, ReactElement } from "react";

export function App(): ReactElement {
  const hero = useVariant("hero-layout");
  const ctaCopy = useVariantValue<string>("cta-copy");
  const badge = useVariantValue<string>("pricing-badge");
  const setVariant = useSetVariant();

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 32, maxWidth: 720 }}>
      <h1>variantlab · React + Vite example</h1>
      <p>
        The engine is loaded from <code>experiments.json</code> at boot. Every{" "}
        <code>useVariant</code> call below resolves deterministically for the demo user.
      </p>

      <section style={{ marginTop: 32 }}>
        <h2>1. useVariant → hero layout: {hero}</h2>
        <Variant experimentId="hero-layout">
          {{
            compact: <div style={compactStyle}>Compact hero</div>,
            wide: <div style={wideStyle}>Wide hero spanning the viewport</div>,
          }}
        </Variant>
        <button
          type="button"
          onClick={() => setVariant("hero-layout", hero === "compact" ? "wide" : "compact")}
        >
          Toggle hero layout
        </button>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>2. useVariantValue → CTA copy</h2>
        <button type="button" style={ctaStyle}>
          {ctaCopy}
        </button>
        <div style={{ marginTop: 8 }}>
          <button type="button" onClick={() => setVariant("cta-copy", "buy-now")}>
            buy-now
          </button>{" "}
          <button type="button" onClick={() => setVariant("cta-copy", "get-started")}>
            get-started
          </button>{" "}
          <button type="button" onClick={() => setVariant("cta-copy", "try-free")}>
            try-free
          </button>
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>3. Pricing badge</h2>
        <div style={badgeStyle}>{badge}</div>
      </section>
    </main>
  );
}

const compactStyle: CSSProperties = {
  padding: 16,
  border: "1px solid #ccc",
  borderRadius: 8,
  background: "#f6f6f6",
};

const wideStyle: CSSProperties = {
  ...compactStyle,
  padding: 48,
  background: "linear-gradient(135deg, #6ee7b7, #3b82f6)",
  color: "white",
};

const ctaStyle: CSSProperties = {
  padding: "12px 24px",
  fontSize: 18,
  background: "#111",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const badgeStyle: CSSProperties = {
  display: "inline-block",
  padding: "4px 12px",
  borderRadius: 999,
  background: "#fef3c7",
  color: "#92400e",
  fontSize: 12,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};
