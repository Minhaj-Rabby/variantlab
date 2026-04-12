import { createVariantLabServer } from "@variantlab/next";
import { VariantLabProvider } from "@variantlab/next/client";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import experiments from "../experiments.json";

export const metadata = {
  title: "variantlab + Next.js",
  description: "Next.js App Router example for variantlab",
};

// Build the server helper once per process.
const server = createVariantLabServer(experiments);

export default function RootLayout({ children }: { children: ReactNode }) {
  // `cookies()` is sync in Next 14 and async in Next 15 — both return
  // an object with a `.get(name)` method, which is what we need. The
  // `as never` cast keeps this file working across both major versions
  // without pulling in version-specific conditional types.
  const store = cookies() as unknown as { get(name: string): { value: string } | undefined };
  const props = server.toProviderProps(store);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
          margin: 0,
          padding: 24,
          background: "#fafafa",
          color: "#111",
        }}
      >
        <VariantLabProvider config={experiments} {...props}>
          {children}
        </VariantLabProvider>
      </body>
    </html>
  );
}
