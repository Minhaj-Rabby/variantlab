"use client";

import { useVariantValue, Variant } from "@variantlab/next/client";
import Link from "next/link";

export default function ClientDemoPage() {
  const heroCopy = useVariantValue<string>("hero-copy");
  const ctaColor = useVariantValue<string>("cta-color");

  return (
    <main style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 12 }}>Client-side demo</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        These variants come from the client engine, which was seeded by the server via{" "}
        <code>initialVariants</code>. They match the server-rendered page.
      </p>

      <h2 style={{ fontSize: 20, marginBottom: 8 }}>useVariantValue</h2>
      <p>
        hero-copy: <strong>{heroCopy}</strong>
      </p>
      <p>
        cta-color:{" "}
        <span
          style={{
            display: "inline-block",
            width: 16,
            height: 16,
            borderRadius: 4,
            background: ctaColor,
            verticalAlign: "middle",
          }}
        />{" "}
        <code>{ctaColor}</code>
      </p>

      <h2 style={{ fontSize: 20, marginTop: 24, marginBottom: 8 }}>&lt;Variant&gt; component</h2>
      <Variant experimentId="layout">
        {{
          compact: <p style={{ padding: 8, background: "#eee" }}>Compact layout 🤏</p>,
          expanded: <p style={{ padding: 24, background: "#eee" }}>Expanded layout 🖐️</p>,
        }}
      </Variant>

      <p style={{ marginTop: 32 }}>
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
