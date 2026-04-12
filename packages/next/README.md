# @variantlab/next

Next.js 14 and 15 bindings for variantlab — App Router, Pages Router, and Edge runtime.

> ![npm version](https://img.shields.io/npm/v/@variantlab/next/alpha?label=npm&color=blue)

## What this package gives you

- **SSR-correct variant resolution.** Resolve variants on the server, seed them into the client engine, and render the same tree twice — no hydration mismatches.
- **Sticky cookies.** A base64url-encoded `__variantlab_sticky` cookie persists the `userId` (and, optionally, pre-resolved assignments) across requests so every refresh shows the same variants.
- **Edge-runtime compatible.** No Node-only APIs, no `process.env`, no `cookie` package, no `crypto.createHash`. Runs on Vercel Edge, Cloudflare Workers, and Deno Deploy.
- **Four subpath entrypoints.** Server-only helpers (`.`), Client Component provider + hooks (`/client`), and router-scoped convenience helpers (`/app-router`, `/pages-router`).
- **≤ 2 KB gzipped** for the server entrypoint, **≤ 1 KB gzipped** for `/client`.

## Peer dependencies

- `next` `^14.0.0 || ^15.0.0`
- `react` `^18.2.0 || ^19.0.0`

## Quick start — App Router

```tsx
// middleware.ts
import { NextResponse } from "next/server";
import { variantLabMiddleware } from "@variantlab/next";
import experiments from "./experiments.json";

export const runtime = "edge";
export const config = { matcher: ["/((?!_next|.*\\..*).*)"] };

const apply = variantLabMiddleware(experiments);

export default function middleware(req) {
  return apply(req, NextResponse.next());
}
```

```tsx
// app/layout.tsx (Server Component)
import { cookies } from "next/headers";
import { createVariantLabServer } from "@variantlab/next";
import { VariantLabProvider } from "@variantlab/next/client";
import experiments from "./experiments.json";

const server = createVariantLabServer(experiments);

export default function RootLayout({ children }) {
  const props = server.toProviderProps(cookies());
  return (
    <html lang="en">
      <body>
        <VariantLabProvider config={experiments} {...props}>
          {children}
        </VariantLabProvider>
      </body>
    </html>
  );
}
```

```tsx
// app/page.tsx (Server Component)
import { cookies } from "next/headers";
import { getVariantValueSSR } from "@variantlab/next";
import experiments from "./experiments.json";

export default function Page() {
  const hero = getVariantValueSSR<string>("hero-copy", cookies(), experiments);
  return <h1>{hero}</h1>;
}
```

```tsx
// app/client-demo/page.tsx
"use client";
import { useVariantValue, Variant } from "@variantlab/next/client";

export default function ClientDemo() {
  const cta = useVariantValue<string>("cta-color");
  return (
    <main>
      <button style={{ background: cta }}>Go</button>
      <Variant experimentId="layout">
        {{
          compact: <p>compact</p>,
          expanded: <p>expanded</p>,
        }}
      </Variant>
    </main>
  );
}
```

## Debug overlay

A side-panel overlay for viewing and overriding experiments during development. Includes the `"use client"` directive so it works in App Router without extra wrappers.

```tsx
// app/layout.tsx
import { VariantDebugOverlay } from "@variantlab/next/debug";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <VariantLabProvider config={experiments} {...props}>
          {children}
          {process.env.NODE_ENV === "development" && <VariantDebugOverlay />}
        </VariantLabProvider>
      </body>
    </html>
  );
}
```

The overlay is tree-shakeable — it only ships when you import `@variantlab/next/debug`. See the [`@variantlab/react` README](../react/README.md#debug-overlay) for full customization options (position, theme, programmatic open/close).

## Subpath exports

| Subpath | Contents | `"use client"` |
|---|---|---|
| `@variantlab/next` | Server helpers, middleware factory, cookie helpers, shared types | ❌ |
| `@variantlab/next/client` | `VariantLabProvider`, all React hooks + components | ✅ |
| `@variantlab/next/debug` | `VariantDebugOverlay` + imperative open/close | ✅ |
| `@variantlab/next/app-router` | App Router-scoped re-exports + `readPayloadFromCookies()` | ❌ |
| `@variantlab/next/pages-router` | Pages Router-scoped re-exports + `readPayloadFromReq(req)` | ❌ |

## Notes on the spec

- `getVariantSSR` / `getVariantValueSSR` are **synchronous**, matching the canonical contract in [`API.md`](../../API.md). The underlying engine is synchronous, so an async wrapper would only add Promise allocation. If you're on Next 15 where `cookies()` is async, `await` it at the call site and pass the resolved store to `getVariantSSR`.
- The middleware writes only `{ v, u, a: {} }` on first visit — it does not compute assignments at the edge. Server Components / Route Handlers can use `server.writePayload(...)` to persist computed assignments back into the cookie if they want to avoid a re-evaluation on the next request.

See the [root README](../../README.md) for project overview, motivation, and roadmap.
