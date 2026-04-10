# Security threat research

Extended research behind the threats and mitigations documented in [`SECURITY.md`](../../SECURITY.md). This file goes deeper into the reasoning, references, and historical incidents that inform each decision.

## Table of contents

- [Scope](#scope)
- [Historical incidents we learned from](#historical-incidents-we-learned-from)
- [Threat categories](#threat-categories)
- [Deep-dives](#deep-dives)
- [Open questions](#open-questions)
- [References](#references)

---

## Scope

variantlab is a client-side configuration and variant-resolution library. Its threat surface includes:

1. **Config integrity** — can the config be tampered with in transit or at rest?
2. **Code execution** — can a malicious config execute code?
3. **Data exfiltration** — can variantlab leak user data?
4. **Storage integrity** — can local storage be tampered with?
5. **Supply chain** — can an upstream compromise affect downstream users?
6. **Denial of service** — can a malicious config crash or exhaust the runtime?

Out of scope (the user's responsibility):

- Authentication of users (we don't do auth)
- Securing the backend that serves the config
- Encrypting user data at rest (handled by the user's backend)
- Protecting secrets used to sign configs (key management is user-owned)

---

## Historical incidents we learned from

### 1. The `event-stream` incident (2018)

**What happened**: A maintainer handed control of a popular npm package (`event-stream`) to an anonymous contributor who added a malicious dependency targeting cryptocurrency wallets.

**Lesson**: Every runtime dependency is a trust decision. Even seemingly benign packages can be compromised. Our response: zero runtime deps in `@variantlab/core`.

**Reference**: https://github.com/dominictarr/event-stream/issues/116

### 2. The `ua-parser-js` hijack (2021)

**What happened**: A compromised maintainer account published a malicious version of `ua-parser-js`, a package with 7M+ weekly downloads.

**Lesson**: Even with 2FA, account compromise is possible. Defense in depth via signed releases and provenance attestations.

**Reference**: https://github.com/advisories/GHSA-pjwm-rvh2-c87w

### 3. The `node-ipc` protestware incident (2022)

**What happened**: A maintainer added code that wiped files on machines with specific geolocation.

**Lesson**: Trust of maintainers cannot be absolute. Our response: reproducible builds so any divergence is detectable.

**Reference**: https://github.com/advisories/GHSA-97m3-w2cp-4xx6

### 4. The `xz-utils` backdoor (2024)

**What happened**: A multi-year social engineering campaign introduced a backdoor into a popular upstream project via a seemingly legitimate contributor.

**Lesson**: Review every contribution with paranoia. Multi-reviewer approval on sensitive changes. Reproducible builds.

**Reference**: https://research.swtch.com/xz-timeline

### 5. Prototype pollution in `lodash.merge` (2018-2020)

**What happened**: Multiple CVEs against `lodash.merge` for prototype pollution via crafted input.

**Lesson**: Don't deep-merge untrusted objects. Our response: no deep merge in config processing; whitelist-only object parsing.

**Reference**: CVE-2019-10744, CVE-2020-8203

### 6. Firebase Remote Config bypass (hypothetical, not a specific CVE)

**What it illustrates**: Any client-controlled config can be tampered with by a sufficiently motivated user. The mitigation is to never trust config for security decisions.

**Lesson**: Our docs must clearly warn users not to use feature flags for access control.

---

## Threat categories

### A. Integrity threats

Threats that allow an attacker to change what config the client sees.

- **A1**: MITM on remote config endpoint
- **A2**: Compromised CDN origin
- **A3**: DNS hijack
- **A4**: BGP hijack
- **A5**: Compromised storage bucket
- **A6**: Compromised npm package
- **A7**: Compromised build pipeline
- **A8**: Local storage tampering

### B. Confidentiality threats

Threats that leak user data or secrets.

- **B1**: Telemetry leaking PII
- **B2**: Analytics integration leaking variant assignments to third parties
- **B3**: Debug overlay shown in production
- **B4**: Error messages revealing experiment structure
- **B5**: Timing attacks on HMAC verification
- **B6**: Cache poisoning allowing observation of other users' states

### C. Availability threats

Threats that cause service degradation or denial of service.

- **C1**: Oversized config
- **C2**: Exponential regex / ReDoS
- **C3**: Deeply nested targeting predicates
- **C4**: Infinite polling loops
- **C5**: Memory exhaustion via time-travel history
- **C6**: Crash storm triggering rollback fatigue

### D. Code execution threats

Threats that achieve arbitrary code execution.

- **D1**: Config containing `eval`-able payloads
- **D2**: Prototype pollution leading to method hijacking
- **D3**: Dynamic import of attacker-controlled URLs
- **D4**: Regex with code execution side effects (does not exist in JS, but in case we ever bind to a native engine)

### E. Misuse threats

Threats that come from mis-configuration by the user.

- **E1**: Using variantlab for authorization decisions
- **E2**: Storing secrets in variant values
- **E3**: Exposing debug overlay in production
- **E4**: Forgetting to verify HMAC on remote configs
- **E5**: Using a weak HMAC key

---

## Deep-dives

### Deep-dive: prototype pollution

JavaScript's prototype chain is a known attack vector. When parsing untrusted JSON:

```js
// UNSAFE
const config = JSON.parse(untrustedInput);
const merged = { ...defaults, ...config };
// If untrustedInput contains `{"__proto__": {"admin": true}}`,
// every object in the program now has `.admin === true`.
```

**Our mitigations**:

1. **Never spread untrusted objects into others**. Use property-by-property allow-listing.
2. **Use `Object.create(null)`** for all parsed data structures. These objects have no prototype.
3. **Explicitly reject keys**: `__proto__`, `constructor`, `prototype`, `__defineGetter__`, `__defineSetter__`.
4. **Freeze the config** after loading so accidental mutations throw in strict mode.

Implementation sketch:

```ts
function safeParse(input: string): unknown {
  const parsed = JSON.parse(input, (key, value) => {
    if (
      key === "__proto__" ||
      key === "constructor" ||
      key === "prototype"
    ) {
      return undefined; // strip it
    }
    return value;
  });
  return parsed;
}
```

### Deep-dive: ReDoS (Regex Denial of Service)

A crafted regex or input can cause catastrophic backtracking, consuming CPU indefinitely.

**Our mitigations**:

1. **Avoid regex in hot paths**. Route globs and semver matching use purpose-built parsers, not regex.
2. **If we must use regex**, only use constant patterns defined by us, never user-supplied patterns.
3. **Input length limits**: config size capped at 1 MB, individual strings capped at 256-512 bytes.
4. **Linear-time matchers**: all targeting predicates are O(n) in input size.

### Deep-dive: HMAC timing attacks

Naive HMAC comparison:

```ts
// UNSAFE
function verify(sig: Uint8Array, expected: Uint8Array): boolean {
  for (let i = 0; i < expected.length; i++) {
    if (sig[i] !== expected[i]) return false;
  }
  return true;
}
```

This is timing-dependent. An attacker measuring verification time can guess the HMAC byte-by-byte.

**Our mitigation**: Use `crypto.subtle.verify` exclusively. It is specified to be constant-time in conforming implementations of the Web Crypto API.

```ts
const valid = await crypto.subtle.verify("HMAC", key, signature, data);
```

We never implement HMAC comparison ourselves.

### Deep-dive: CSP compatibility

Content Security Policy is a browser feature that restricts what code can execute. The strictest policies reject:

- Inline scripts (`'unsafe-inline'`)
- `eval` and friends (`'unsafe-eval'`)
- External scripts not from explicit origins
- `data:` URIs in script-src

**variantlab is CSP-strict compatible**:

- Zero uses of `eval`, `Function()`, `setTimeout("string")`, `setInterval("string")`
- Zero inline `<script>` injection
- Debug overlay CSS is applied via inline styles only in dev mode (guarded by `__DEV__`)

We test CSP compatibility via a Playwright test that loads an example app under `Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'`.

### Deep-dive: supply chain attack surface

Even with zero runtime dependencies, our supply chain includes:

1. **Dev dependencies** (tsup, typescript, biome, etc.) used at build time
2. **The build pipeline** (GitHub Actions runners, tools)
3. **The publish pipeline** (npm registry, our tokens)
4. **The end-user's install process** (lockfile, post-install scripts)

**Our mitigations**:

- **Pin dev dependencies to exact versions** in `pnpm-lock.yaml`
- **Regular `pnpm audit`** in CI
- **`socket.dev` checks** on every PR for known bad packages
- **Sigstore signing** on every release
- **npm provenance** attesting to the exact GitHub Actions workflow run
- **Hardware-key-protected maintainer accounts**
- **No post-install scripts** in any published package
- **Reproducible build** documentation so anyone can verify tarballs

### Deep-dive: debug overlay in production

A developer copies `<VariantDebugOverlay />` into `app.tsx` for dev work, forgets to gate it, and ships it to production. End users can now toggle experiments.

**Our mitigations**:

1. **Tree-shake by default**. The overlay lives in a separate entry point (`@variantlab/react-native/debug`) that production builds can skip.
2. **Runtime guard**. The overlay component checks `process.env.NODE_ENV !== "production"` and throws a loud error in prod unless an explicit `__forceDevOverlay` prop is set.
3. **ESLint rule** (Phase 3) that warns when the overlay is imported without a `__DEV__` guard.
4. **Documentation** — every example shows the guard.
5. **Documentation alert** — a big warning banner on the overlay docs page.

### Deep-dive: variantlab is not a security control

Feature flags are often misused as access control. A flag `isAdmin: true` is trivially flippable by the user via local storage tampering or debug overlay.

**Our docs must state prominently**:

> **variantlab is not an authorization mechanism. Do not use feature flags to control access to sensitive data or operations. All security decisions must be enforced server-side.**

We include this warning in:

- `README.md`
- `SECURITY.md`
- `docs/features/killer-features.md`
- The debug overlay itself (a small warning next to the pick buttons)

---

## Open questions

1. **Should we ship a reference HMAC-signing Cloudflare Worker?** Yes — it demonstrates the pattern and gives users a working starting point. Target: Phase 4.
2. **Should we support encryption at rest for local storage?** Debated. Most cases don't need it. We'll ship an `EncryptedStorageAdapter` as an optional entry point in Phase 4.
3. **Should we have a bug bounty?** Not until post-v1.0. Until then, rely on responsible disclosure.
4. **Should core run in a Web Worker?** Interesting but not required. Users can instantiate the engine in a worker themselves if desired.
5. **Do we need a Content-Security-Policy reporting endpoint?** No — we don't process reports, users do.

---

## References

- Web Crypto API: https://www.w3.org/TR/WebCryptoAPI/
- OWASP Top 10 for LLMs: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- CSP Level 3: https://www.w3.org/TR/CSP3/
- Sigstore: https://www.sigstore.dev/
- npm Provenance: https://docs.npmjs.com/generating-provenance-statements
- SLSA: https://slsa.dev/
- CycloneDX SBOM: https://cyclonedx.org/
- Prototype Pollution primer: https://github.com/BlackFan/client-side-prototype-pollution
- ReDoS primer: https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS

---

## See also

- [`SECURITY.md`](../../SECURITY.md) — the canonical threat model and mitigations
- [`docs/features/hmac-signing.md`](../features/hmac-signing.md) — HMAC signing implementation
- [`docs/research/bundle-size-analysis.md`](./bundle-size-analysis.md) — why zero deps matters for security too
