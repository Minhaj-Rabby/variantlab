import { getVariantSSR, getVariantValueSSR } from "@variantlab/next";
import { cookies } from "next/headers";
import Link from "next/link";
import experiments from "../experiments.json";

export default function HomePage() {
  const store = cookies() as unknown as { get(name: string): { value: string } | undefined };

  const heroCopy = getVariantValueSSR<string>("hero-copy", store, experiments);
  const ctaColor = getVariantValueSSR<string>("cta-color", store, experiments);
  const layout = getVariantSSR("layout", store, experiments);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: layout === "expanded" ? 56 : 40, marginBottom: 12 }}>
        {heroCopy ?? "Ship experiments faster."}
      </h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        Server-rendered variants. Same values on every refresh. Zero hydration mismatches. View the
        page source and compare it against the first paint — they match byte-for-byte.
      </p>
      <button
        type="button"
        style={{
          background: ctaColor ?? "#2563eb",
          color: "white",
          border: 0,
          borderRadius: 6,
          padding: "12px 24px",
          fontSize: 16,
          cursor: "pointer",
        }}
      >
        Get started
      </button>
      <ul style={{ marginTop: 32, lineHeight: 2 }}>
        <li>
          <Link href="/client-demo">Client-side demo (hooks + components)</Link>
        </li>
        <li>
          <a href="/api/hello">Route Handler demo (/api/hello)</a>
        </li>
      </ul>
      <p style={{ marginTop: 32, color: "#999", fontSize: 12 }}>
        Experiments: hero-copy <code>{`"${heroCopy}"`}</code>, cta-color <code>{ctaColor}</code>,
        layout <code>{layout}</code>
      </p>
    </main>
  );
}
