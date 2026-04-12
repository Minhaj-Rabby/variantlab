# Framework SSR quirks

Notes on how each target framework handles server-side rendering, hydration, and the implications for variantlab. This document is the reference for implementing each adapter.

## Table of contents

- [Common concerns](#common-concerns)
- [Next.js App Router](#nextjs-app-router)
- [Next.js Pages Router](#nextjs-pages-router)
- [Remix](#remix)
- [SvelteKit](#sveltekit)
- [SolidStart](#solidstart)
- [Nuxt](#nuxt)
- [Astro](#astro)
- [React Native](#react-native)
- [Edge runtime targets](#edge-runtime-targets)

---

## Common concerns

Every SSR framework has the same core problem for A/B testing: the server renders one variant, the client hydrates, and if the client picks a different variant, React/Vue/Svelte throws a hydration mismatch error.

### Solutions available

1. **Sticky cookie**: server sets a cookie with the variant assignment; client reads the same cookie on hydration.
2. **Streaming with suspense**: server holds rendering until it knows the variant; client streams the result.
3. **Defer to client**: render a placeholder on server, pick the variant on client. This is the easy way but causes layout shift.
4. **Edge middleware**: assign the variant at the edge before the request hits the renderer, then pass it via headers.

variantlab supports all four, with sticky cookie as the recommended default.

### Invariants variantlab must uphold

- **Deterministic assignment**: given the same `(userId, experimentId, context)`, always produce the same variant.
- **No `Math.random()` on the hot path**: non-deterministic → hydration mismatches.
- **No `Date.now()` in pure assignment**: time-based targeting only at evaluation boundaries.
- **Stable ordering of experiments**: iteration order must match server and client.
- **No environment-specific branches in assignment logic**: server code must match client code byte-for-byte.

---

## Next.js App Router

Next.js 14/15 App Router uses React Server Components (RSC). Server components can read variants freely; client components need a context.

### Architecture

```
┌─────────────────────────────────────────────────┐
│  middleware.ts                                   │
│  Reads cookies, sets sticky variant cookie       │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│  app/layout.tsx (Server Component)               │
│  Reads cookies via next/headers                  │
│  Creates initial variant map                      │
│  Wraps children in VariantLabProvider            │
│  (client component, re-hydrates from initial map)│
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│  Server components: read via getVariantSSR()    │
│  Client components: useVariant() hook            │
└──────────────────────────────────────────────────┘
```

### Our implementation

- **Middleware** sets a cookie `variantlab_v1` containing an encoded map of `(experimentId → variantId)` for eligible experiments
- **Root layout** reads the cookie via `cookies()` from `next/headers`, decodes it, and passes it to `<VariantLabProvider initialVariants={...}>`
- **Server components** import `getVariantSSR(experimentId, cookies())` which is a pure function
- **Client components** use the React hooks via the provider

### Pitfalls

1. **Dynamic vs static rendering.** If a page reads cookies, Next.js marks it as dynamic. This affects caching. We document this clearly.
2. **RSC boundary.** `VariantLabProvider` must be a client component. We re-export it from `@variantlab/next/client` with `"use client"` directive.
3. **Cookie size.** Next.js cookies are limited to 4 KB. If you have many experiments, we compress the cookie (base64-encoded minified JSON, or pack variant IDs as small integers).
4. **Parallel routes and intercepting routes.** These can render the same provider multiple times. Our provider detects this and de-duplicates.

### Example

```tsx
// middleware.ts
import { variantLabMiddleware } from "@variantlab/next/middleware";
import config from "./experiments.json";

export default variantLabMiddleware(config);
export const config = { matcher: ["/((?!_next|api).*)"] };

// app/layout.tsx
import { cookies } from "next/headers";
import { VariantLabProvider } from "@variantlab/next/client";
import experiments from "./experiments.json";

export default function RootLayout({ children }) {
  const cookieStore = cookies();
  const initialVariants = JSON.parse(
    cookieStore.get("variantlab_v1")?.value ?? "{}"
  );
  return (
    <html>
      <body>
        <VariantLabProvider
          config={experiments}
          initialVariants={initialVariants}
        >
          {children}
        </VariantLabProvider>
      </body>
    </html>
  );
}

// app/page.tsx (server component)
import { getVariantSSR } from "@variantlab/next";
import experiments from "./experiments.json";

export default async function Page() {
  const cookieStore = cookies();
  const variant = getVariantSSR("cta-copy", cookieStore, experiments);
  return <button>{variant === "buy-now" ? "Buy now" : "Get started"}</button>;
}
```

---

## Next.js Pages Router

Older model. Simpler but less flexible.

### Architecture

- `getServerSideProps` reads cookies, picks variant, passes as prop
- `_app.tsx` wraps in `<VariantLabProvider>` with initial variants
- Client hooks work as in any React app

### Example

```tsx
// pages/_app.tsx
import { VariantLabProvider } from "@variantlab/next/client";
import experiments from "../experiments.json";

export default function MyApp({ Component, pageProps }) {
  return (
    <VariantLabProvider
      config={experiments}
      initialVariants={pageProps.variantlab ?? {}}
    >
      <Component {...pageProps} />
    </VariantLabProvider>
  );
}

// pages/index.tsx
import { getVariantSSR } from "@variantlab/next";
import experiments from "../experiments.json";

export async function getServerSideProps({ req, res }) {
  const variant = getVariantSSR("cta-copy", req, experiments);
  return {
    props: {
      variantlab: { "cta-copy": variant },
    },
  };
}
```

### Pitfalls

- `getStaticProps` cannot run variant assignment (no cookies). Users must use `getServerSideProps` or client-side assignment.

---

## Remix

Remix uses loaders for server-side data fetching. Loaders run on every request, making them ideal for variant assignment.

### Architecture

- A root loader reads cookies, creates an initial variant map, returns it
- `<VariantLabProvider>` wraps the root
- Action functions can also read variants

### Example

```tsx
// app/root.tsx
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { VariantLabProvider } from "@variantlab/remix";
import experiments from "./experiments.json";
import { parseVariantCookie } from "@variantlab/remix/server";

export async function loader({ request }) {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const initialVariants = parseVariantCookie(cookieHeader);
  return json({ initialVariants });
}

export default function App() {
  const { initialVariants } = useLoaderData<typeof loader>();
  return (
    <VariantLabProvider config={experiments} initialVariants={initialVariants}>
      <Outlet />
    </VariantLabProvider>
  );
}
```

### Pitfalls

- Remix nested routes mean the provider sits at the root. Inner routes cannot create their own provider without duplicating state.
- Action functions that redirect must re-set the variant cookie, otherwise the next loader will re-assign.

---

## SvelteKit

SvelteKit uses `load` functions (server and client) and hooks.

### Architecture

- `src/hooks.server.ts` uses `handle` to read cookies and set a local variant context
- `src/routes/+layout.server.ts` exposes the variant map via `event.locals.variantlab`
- `src/routes/+layout.svelte` wraps children in `<VariantLabProvider>`

### Example

```ts
// src/hooks.server.ts
import type { Handle } from "@sveltejs/kit";
import { createEngine } from "@variantlab/core";
import experiments from "../experiments.json";

export const handle: Handle = async ({ event, resolve }) => {
  const engine = createEngine(experiments, { storage: event.cookies });
  event.locals.variantlab = engine;
  return resolve(event);
};
```

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { VariantLabProvider } from "@variantlab/svelte";
  import experiments from "../experiments.json";
  export let data;
</script>

<VariantLabProvider config={experiments} initialVariants={data.variantlab}>
  <slot />
</VariantLabProvider>
```

### Pitfalls

- Svelte 4 vs Svelte 5 have different runes. We support both with separate entry points.
- `$app/stores` vs `$app/state` (Svelte 5) — we abstract over both.

---

## SolidStart

Solid is similar to React but uses fine-grained reactivity via signals.

### Architecture

- `createVariantLabEngine` returns a signal-based store
- `useVariant` returns an accessor function (not a value directly)
- `<VariantLabProvider>` is a regular component

### Pitfalls

- Solid's reactivity graph is different from React's. We must not use React's `useSyncExternalStore`-style pattern; instead we create signals.
- SSR in SolidStart uses `createAsync` and `isServer` checks. We handle both.

---

## Nuxt

Vue 3 meta-framework. Uses Nitro server routes and the Vue composition API.

### Architecture

- `nuxt.config.ts` installs `@variantlab/nuxt` module
- Module auto-imports `useVariant()` composable
- Server-side: `event.context.variantlab` via Nitro middleware
- Client-side: `<VariantLabProvider>` via plugin

### Pitfalls

- Nuxt's auto-import can cause name collisions. We prefix our composables with `useVariant*` to minimize conflict.
- Server and client must share the same engine state via `useState`-style hydration.

---

## Astro

Astro uses "islands" — interactive components inside a mostly-static HTML page. Different framework islands can coexist on the same page.

### Architecture

- `astro.config.mjs` installs `@variantlab/astro` integration
- Pages and components read variants via `Astro.locals.variantlab` at build/request time
- Islands hydrate with initial variants passed as props

### Pitfalls

- Each island is its own framework instance (React island, Vue island, etc.). Each needs its own provider hydration.
- SSG vs SSR: for static pages, variant selection happens at build time or at the edge middleware layer.

---

## React Native

No SSR. Simpler, but has its own quirks.

### Architecture

- `<VariantLabProvider>` wraps the app
- Storage uses AsyncStorage / MMKV / SecureStore
- Debug overlay uses RN native components
- Deep link handler integrates with Expo Linking or React Navigation

### Pitfalls

1. **Hermes optimization**: Some JS features that work in V8 don't optimize well in Hermes. We avoid `Proxy` in hot paths.
2. **New Architecture (Fabric) compatibility**: We test against both Old and New architectures.
3. **Offline**: storage reads can fail. We fall back to in-memory defaults.
4. **AsyncStorage vs MMKV**: AsyncStorage is async, MMKV is sync. We handle both in the `Storage` interface.
5. **Expo Go vs bare**: some APIs (SecureStore) are available only in custom dev builds. We document this clearly.

---

## Edge runtime targets

### Cloudflare Workers

- Web API subset (no Node built-ins)
- `crypto.subtle` available — our HMAC verification works out of the box
- KV storage for remote config caching
- 1 MB unzipped bundle limit — our 3 KB target is well within

### Vercel Edge

- Similar to Cloudflare Workers
- `NextRequest` / `NextResponse` APIs
- Middleware runs at the edge — perfect for cookie-based assignment

### Deno Deploy

- Full Deno runtime
- `crypto.subtle` available
- Standard Web Fetch API

### Bun

- Mostly Node-compatible
- Bun's fast `Bun.hash` can optionally be used for sticky assignment (gated behind a check)

### AWS Lambda@Edge

- Node-based but runs at CloudFront edge
- Limited execution time (low milliseconds)
- We fit within the constraints

---

## Implementation priority

Based on framework popularity and user demand, we'll implement SSR support in this order:

1. **Next.js App Router** (Phase 1) — largest audience
2. **Next.js Pages Router** (Phase 1) — still widely used
3. **React Native** (Phase 1) — primary audience for our debug overlay killer feature
4. **Remix** (Phase 2)
5. **SvelteKit** (Phase 3)
6. **SolidStart** (Phase 3)
7. **Nuxt** (Phase 3)
8. **Astro** (Phase 3)

---

## See also

- [`API.md`](../../API.md#variantlabnext) — the SSR API surface
- [`docs/features/hmac-signing.md`](../features/hmac-signing.md) — Web Crypto API usage
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md#runtime-data-flow) — engine data flow
