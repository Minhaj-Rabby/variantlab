/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `@variantlab/*` packages ship as pre-built ESM with
  // `"type": "module"` and correct `"exports"` maps, so Next's module
  // resolver can consume them directly — no `transpilePackages` needed.
  // Listing them here would trigger Next's SWC pass over `.js` files
  // under `dist/`, which misclassifies them as CommonJS and breaks
  // `"use client"` client boundaries under `@variantlab/next/client`.
};

export default nextConfig;
