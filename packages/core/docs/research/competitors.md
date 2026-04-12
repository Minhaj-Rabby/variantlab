# Competitor analysis

A detailed comparison of variantlab to every existing A/B testing and feature-flagging solution we evaluated. The goal of this document is to be honest: where competitors do something better, we say so, and we plan to match or exceed them.

## Table of contents

- [Methodology](#methodology)
- [Summary matrix](#summary-matrix)
- [Firebase Remote Config](#firebase-remote-config)
- [GrowthBook](#growthbook)
- [Statsig](#statsig)
- [LaunchDarkly](#launchdarkly)
- [Amplitude Experiment](#amplitude-experiment)
- [PostHog Feature Flags](#posthog-feature-flags)
- [Flagsmith](#flagsmith)
- [Unleash](#unleash)
- [ConfigCat](#configcat)
- [react-native-ab](#react-native-ab)
- [Why a new package](#why-a-new-package)

---

## Methodology

For each competitor we evaluated:

1. **Pricing** — free tier, paid tier, what you give up for free
2. **Framework support** — which frameworks have official SDKs, which are community-maintained
3. **SSR support** — does it work in Next.js App Router, Remix, SvelteKit without hydration mismatches
4. **Bundle size** — minified + gzipped for the primary SDK
5. **Runtime dependencies** — transitive supply chain exposure
6. **Self-hosting** — can you run the whole thing on your own infra
7. **Debug tooling** — what do you get for local development
8. **Security model** — HMAC, encryption, CSP compatibility
9. **Privacy** — what telemetry does the SDK send
10. **Type safety** — are experiment IDs typed

Sources: official documentation, npm package analysis, GitHub repos, pricing pages, community forums (as of early 2026).

---

## Summary matrix

| Tool | Free forever | Self-host | Bundle (gz) | Deps | Multi-framework | SSR | Type safety | Privacy |
|---|:-:|:-:|---:|---:|:-:|:-:|:-:|:-:|
| **variantlab** | ✅ | ✅ | ~3 KB | 0 | 10+ | ✅ | ✅ codegen | ✅ zero telemetry |
| Firebase Remote Config | Limited | ❌ | ~18 KB | many | 3 | Partial | ❌ | ❌ Google telemetry |
| GrowthBook | ✅ OSS | ✅ | ~7 KB | few | 5 | Partial | Partial | Partial |
| Statsig | Limited free | ❌ | ~14 KB | some | 4 | Partial | Partial | ❌ |
| LaunchDarkly | ❌ $$$ | ❌ | ~25 KB | some | 8 | ✅ | Partial | ❌ |
| Amplitude Experiment | Enterprise | ❌ | ~20 KB | many | 3 | Partial | ❌ | ❌ |
| PostHog Feature Flags | ✅ OSS | ✅ | ~30 KB | many | 4 | Partial | ❌ | Partial |
| Flagsmith | ✅ OSS | ✅ | ~8 KB | few | 4 | Partial | ❌ | Partial |
| Unleash | ✅ OSS | ✅ | ~10 KB | some | 5 | Partial | ❌ | Partial |
| ConfigCat | Limited | ❌ | ~12 KB | few | 5 | Partial | ❌ | ❌ |
| react-native-ab | ✅ OSS | N/A | ~2 KB | 0 | 1 | N/A | ❌ | ✅ |

Numbers are approximate and reflect the primary SDK (`firebase/remote-config`, `@growthbook/growthbook-react`, etc.) at the time of research.

---

## Firebase Remote Config

**Pricing**: Free under the Spark plan with limits; paid under Blaze.

**Strengths**:
- Mature, battle-tested, used by billions of users
- Tight integration with other Firebase products (Analytics, Crashlytics)
- A/B Testing Console has a decent UI
- Works offline with local caching

**Weaknesses for us to beat**:
- **Lock-in** — tied to Google Cloud. You can't migrate away without rewriting.
- **Bundle size** — the Web SDK pulls in 18 KB+ of Firebase app initialization code even for a single `getValue()` call.
- **Telemetry-by-default** — sends analytics events on every config fetch.
- **No true SSR support** — Firebase Web SDK assumes a browser global.
- **No screen-size targeting** — you have to implement it yourself.
- **No type safety** — values are stringly-typed; you cast on read.
- **No debug picker UI** — you build your own.
- **No self-host option** — you cannot run Remote Config without Google Cloud.
- **Config signing is proprietary** — verified by Google's infrastructure, not cryptographically auditable by the client.

**Verdict**: Great if you're already all-in on Firebase. Wrong choice for anyone who wants portability, small bundles, or strong privacy.

---

## GrowthBook

**Pricing**: Free open-source + paid SaaS.

**Strengths**:
- Open source core, self-hostable
- Well-designed A/B test result analysis (Bayesian + frequentist)
- React, Vue, and Node SDKs
- Visual editor (paid)
- Feature flag concept is well-modeled

**Weaknesses for us to beat**:
- **Web-first, React Native is an afterthought** — the RN SDK is a wrapper around the JS SDK with known issues around offline mode.
- **No Svelte, Solid, or Astro support.**
- **Bundle size is ~7 KB gzipped** for the React SDK, which is better than Firebase but still 2x our target.
- **No crash-triggered rollback.**
- **No debug overlay out of the box** — you get a "debug panel" in the dashboard, not on-device.
- **No deep link override.**
- **SSR works but is manual** — you must hydrate context yourself.
- **Type safety is partial** — you can type feature keys in TS but it's not auto-generated from config.

**Verdict**: The best existing OSS option, and a worthy benchmark. variantlab's differentiation is (a) wider framework support, (b) smaller bundle, (c) better RN story, (d) on-device debug tooling, (e) HMAC signing.

---

## Statsig

**Pricing**: Free tier up to a modest event volume, then paid.

**Strengths**:
- Fastest-growing in the space
- Excellent real-time experiment dashboards
- Native SDKs for iOS and Android (not just React Native)
- Pulse analysis for automated decisioning

**Weaknesses for us to beat**:
- **Telemetry is mandatory** — Statsig's core value prop is sending events back to their dashboard
- **No self-host** in the free tier
- **Bundle size** ~14 KB
- **Framework support** is limited to React, React Native, Node, and browsers
- **Target audience is teams with data scientists** — overkill for a solo developer

**Verdict**: Excellent product for a funded startup. Overkill and underfit for our audience of developers who want a free, lightweight, self-contained toolkit.

---

## LaunchDarkly

**Pricing**: Starts at ~$8.33/seat/month, enterprise features much higher.

**Strengths**:
- Industry standard for feature flags in regulated enterprises
- Best-in-class approval workflows and audit logs
- Wide framework support (8+ SDKs)
- Excellent SSR support including streaming
- Crash-triggered rollback (in enterprise tier)

**Weaknesses for us to beat**:
- **Not free.** At all. For anyone.
- **Bundle size ~25 KB** gzipped for the browser SDK
- **Telemetry mandatory** — core value prop is shipping events to the dashboard
- **Vendor lock-in** — their proprietary targeting DSL does not map cleanly to anything else
- **Adoption cost is high** — requires org-wide buy-in

**Verdict**: The feature set we want to match for free. LaunchDarkly's crash-rollback, approval workflows, and SSR streaming are the north star.

---

## Amplitude Experiment

**Pricing**: Enterprise tier of Amplitude Analytics. Not sold standalone.

**Strengths**:
- Tight integration with Amplitude's behavioral analytics
- Sophisticated cohort-based targeting

**Weaknesses for us to beat**:
- **Enterprise-only**
- **Bundle size ~20 KB** plus Amplitude's core SDK
- **Telemetry-heavy**
- **React Native support is limited**

**Verdict**: Not relevant to our audience. Listed for completeness.

---

## PostHog Feature Flags

**Pricing**: Free tier generous; paid for high volume.

**Strengths**:
- Open source and self-hostable
- Part of the broader PostHog analytics platform
- Good React and RN SDKs

**Weaknesses for us to beat**:
- **Bundle size ~30 KB** for the primary SDK because it's coupled to PostHog's analytics
- **Telemetry coupling** — feature flags require PostHog's event pipeline
- **No type safety from config**
- **No on-device debug picker**
- **No SSR story for Next.js App Router**

**Verdict**: Good choice if you already use PostHog for analytics. Heavy if you don't.

---

## Flagsmith

**Pricing**: Free OSS + paid SaaS.

**Strengths**:
- Open source and self-hostable
- Multi-environment support built in
- Segment-based targeting

**Weaknesses for us to beat**:
- **Bundle size ~8 KB**
- **SSR requires manual hydration**
- **React Native SDK has network-request-per-flag antipattern**
- **No type safety**
- **No on-device debug tooling**

**Verdict**: Solid for server-side feature flags. Weak on mobile.

---

## Unleash

**Pricing**: Free OSS + paid SaaS.

**Strengths**:
- Open source and self-hostable
- Focus on enterprise feature flags (as opposed to A/B testing)
- Well-designed API

**Weaknesses for us to beat**:
- **Weak A/B testing story** — designed as a flagging tool, not an experiment tool
- **No React Native SDK** (as of early 2026)
- **No debug overlay**
- **No type safety**

**Verdict**: Enterprise-flag focused. Different problem space.

---

## ConfigCat

**Pricing**: Free tier up to 10 feature flags.

**Strengths**:
- Simple, focused on feature flags
- Wide SDK coverage

**Weaknesses for us to beat**:
- **10-flag limit on free tier**
- **Bundle size ~12 KB**
- **No A/B test analysis**
- **No debug picker**
- **Telemetry by default**

**Verdict**: Too limited for our audience.

---

## react-native-ab

**Pricing**: Free OSS.

**Strengths**:
- Tiny (~2 KB)
- Zero dependencies
- Simple API

**Weaknesses for us to beat**:
- **Unmaintained** — last release 2+ years ago
- **React Native only**
- **No targeting beyond random split**
- **No persistence**
- **No debug picker**
- **No SSR**
- **No type safety**

**Verdict**: The closest thing to what we want, and the direct inspiration for variantlab. But it hasn't grown up — variantlab is what `react-native-ab` could have been.

---

## Why a new package

Looking at the matrix, every existing option fails at least one of the following:

1. **Free forever with no usage caps**
2. **Zero runtime dependencies**
3. **Smaller than 5 KB gzipped**
4. **Full multi-framework support**
5. **Strong SSR correctness**
6. **On-device debug tooling**
7. **Type safety from codegen**
8. **Zero telemetry by default**

variantlab's thesis: it is possible to do all of these at once, and no one has. That's the opportunity.

### What we should copy

- **LaunchDarkly's crash rollback** — best-in-class, bring it to free
- **GrowthBook's Bayesian analysis story** — reuse for post-v1.0 analytics integrations
- **Statsig's real-time targeting evaluation UI** — bring that to our debug overlay
- **Firebase's offline caching** — our Storage adapters already do this
- **PostHog's self-host-first ethos** — we do the same, but lighter

### What we should avoid

- **Firebase's bundle bloat** from an over-engineered SDK initialization story
- **Statsig's telemetry coupling** — we separate engine from analytics
- **LaunchDarkly's proprietary DSL** — we use plain JSON
- **GrowthBook's manual SSR hydration** — we automate it
- **Everyone's lack of on-device debug pickers** — this is our wedge

### Where we will lose (at first)

- **Dashboard UX** — we don't ship a hosted dashboard in v0.1. GrowthBook, Statsig, LaunchDarkly all do. We bet that the CLI + JSON config workflow is enough for early adopters.
- **Analytics integration depth** — PostHog ships with full event tracking. We only call `onExposure` hooks; integrators wire the rest.
- **Marketing** — we're a 1-person OSS project vs funded startups.

These are acceptable losses for v0.1. Post-v1.0 we can address the first two.

---

## Sources

- Firebase Remote Config docs: https://firebase.google.com/docs/remote-config
- GrowthBook docs: https://docs.growthbook.io
- Statsig docs: https://docs.statsig.com
- LaunchDarkly docs: https://docs.launchdarkly.com
- Amplitude Experiment docs: https://www.docs.developers.amplitude.com/experiment/
- PostHog docs: https://posthog.com/docs/feature-flags
- Flagsmith docs: https://docs.flagsmith.com
- Unleash docs: https://docs.getunleash.io
- ConfigCat docs: https://configcat.com/docs
- react-native-ab on npm: https://www.npmjs.com/package/react-native-ab

Bundle sizes measured via Bundlephobia and direct npm tarball inspection.
