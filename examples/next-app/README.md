# next-app-example

Minimal Next.js 14 App Router example that exercises every piece of
`@variantlab/next`:

- **Middleware** — `middleware.ts` writes a sticky `__variantlab_sticky`
  cookie on the first visit (`export const runtime = "edge"`).
- **Server Component resolution** — `app/layout.tsx` reads the cookie via
  `createVariantLabServer(...).toProviderProps(...)` and forwards seeded
  variants to the client provider.
- **SSR helpers** — `app/page.tsx` calls `getVariantValueSSR()` to render
  hero copy, CTA color, and layout at request time.
- **Client Component hooks** — `app/client-demo/page.tsx` demonstrates
  `useVariantValue()` and `<Variant>` from `@variantlab/next/client`.
- **Route Handler** — `app/api/hello/route.ts` resolves variants on the
  Edge runtime from a plain `Request`.

## Dev workflow

Workspace packages are resolved through `transpilePackages` in
`next.config.mjs`. You still need to build `@variantlab/next` (and its
dependencies) at least once so TypeScript type information is available:

```bash
# From the repo root
pnpm install
pnpm -r build                 # topological: core → react → next
pnpm --filter next-app-example dev
# → open http://localhost:3000
```

## Production build

```bash
pnpm --filter next-app-example build
pnpm --filter next-app-example start
```

## Manual verification checklist

1. Open http://localhost:3000.
2. DevTools → Application → Cookies: confirm `__variantlab_sticky`
   exists, is `HttpOnly`, and is `SameSite=Lax`.
3. DevTools → Console: **zero** hydration mismatch warnings.
4. View source: the server-rendered HTML for the hero, CTA, and layout
   matches what the client eventually displays.
5. Hard-refresh 10 times: the same variants every time.
6. `curl http://localhost:3000/api/hello`: returns a JSON body with the
   same three variants.
7. `curl -I http://localhost:3000/`: on the first request, the response
   contains `Set-Cookie: __variantlab_sticky=...`. On subsequent
   requests (with the cookie) no `Set-Cookie` is written.
