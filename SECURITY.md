# Security

variantlab is designed with security as a first-class concern, not an afterthought. This document describes the threat model, mitigations, reporting process, and our commitments.

## Table of contents

- [Threat model](#threat-model)
- [Mitigations](#mitigations)
- [Security commitments](#security-commitments)
- [Dependency policy](#dependency-policy)
- [Supply chain integrity](#supply-chain-integrity)
- [Privacy commitments](#privacy-commitments)
- [Reporting a vulnerability](#reporting-a-vulnerability)
- [Disclosure policy](#disclosure-policy)

---

## Threat model

We consider the following threat actors and attack scenarios:

### T1 — Malicious CDN / compromised remote config

**Actor**: An attacker who can modify the bytes returned by a user's remote config endpoint (compromised CDN, MITM, DNS hijack, compromised cloud storage bucket).

**Attack**: Inject a variant config that redirects users to a malicious UI, disables security features behind flags, or exposes private data.

**Mitigation**: Optional HMAC-SHA256 signed configs. Users sign their config with a secret key at build time, ship the public key with the app, and the engine verifies the signature before applying any config. See [`docs/features/hmac-signing.md`](./docs/features/hmac-signing.md).

### T2 — Tampered local storage

**Actor**: A malicious app on the same device, a user trying to cheat an experiment, or a compromised browser extension.

**Attack**: Write arbitrary keys to AsyncStorage / localStorage to force a variant.

**Mitigation**:
1. Variants read from storage are validated against the config. If the stored variant ID is not in the experiment's variant list, the engine discards it and re-assigns.
2. `@variantlab/react-native/secure-store` adapter uses encrypted keychain storage for sensitive experiments.
3. In fail-closed mode, the engine throws on unknown variants instead of silently accepting them.

### T3 — Config-based XSS / code injection

**Actor**: An attacker who controls the config file (e.g., a compromised Git repo, a malicious PR merged by mistake).

**Attack**: Inject executable code via the config — e.g., a predicate string that gets `eval()`'d.

**Mitigation**: **variantlab never uses `eval`, `Function()`, or dynamic `import()` on config data.** Targeting predicates are JSON-shaped data structures interpreted by a pure function, not code. Custom predicates (the `targeting.predicate` field) can only be supplied *in application code*, not in the JSON config.

### T4 — Prototype pollution

**Actor**: An attacker who can feed crafted JSON to the engine.

**Attack**: Prototype pollution via keys like `__proto__` or `constructor.prototype`.

**Mitigation**: The hand-rolled schema validator uses `Object.create(null)` for all parsed objects and explicitly rejects `__proto__`, `constructor`, and `prototype` as object keys. Never spreads untrusted objects without allow-listing.

### T5 — Denial of service via large / malicious config

**Actor**: An attacker who can feed crafted JSON.

**Attack**: Configs with exponential regex targets, deeply nested objects, or huge arrays to exhaust CPU/memory.

**Mitigation**:
- Hard limit: configs larger than 1 MB are rejected
- Hard limit: experiments with more than 100 variants are rejected
- Hard limit: nesting depth in targeting trees is capped at 10
- Route glob matching uses a linear-time matcher, not RegExp
- Semver matching uses a purpose-built parser, not RegExp backtracking

### T6 — Timing attacks on HMAC verification

**Actor**: A local attacker who can observe timing differences.

**Attack**: Guess HMAC bytes by measuring verification timing.

**Mitigation**: HMAC verification uses `crypto.subtle.verify` (Web Crypto API), which is constant-time by spec in all major implementations.

### T7 — Supply chain attack on variantlab itself

**Actor**: A compromised maintainer account, a compromised npm registry, or a malicious transitive dependency.

**Attack**: Ship malicious code to users via npm.

**Mitigation**:
1. **Zero runtime dependencies in `@variantlab/core`**. There is no transitive supply chain to compromise.
2. **Per-release SBOM** published as a CycloneDX document attached to every GitHub release.
3. **Signed releases** via `npm publish --provenance` and Sigstore — publicly verifiable.
4. **Branch protection + required reviews** on the main branch.
5. **Scoped npm tokens** with 2FA enforced on all maintainer accounts.
6. **Automated `npm audit` + `socket.dev` checks** on every PR.

### T8 — Debug overlay exposing sensitive experiments in production

**Actor**: A developer who forgot to tree-shake the debug overlay.

**Attack**: End users see an internal debug UI, potentially revealing unreleased features or exposing a variant-override surface.

**Mitigation**:
1. `VariantDebugOverlay` is exported from a dedicated entry point so bundlers can tree-shake it cleanly.
2. The overlay component throws in production builds unless `process.env.NODE_ENV === "development"` or an explicit `__forceDevOverlay` prop is passed.
3. Documentation strongly recommends gating the overlay behind `__DEV__` or `NODE_ENV`.
4. A linter rule (phase 3) warns when the overlay is imported without a production guard.

### T9 — Deep link abuse

**Actor**: A malicious website or app that opens a deep link on an installed variantlab-enabled app.

**Attack**: Force users into a broken experiment variant, or flip experiments to hide security warnings.

**Mitigation**:
1. Deep link handling is **off by default**. Users must explicitly call `registerDeepLinkHandler`.
2. Deep links only work for experiments explicitly marked `overridable: true` in config.
3. Deep links are session-scoped by default; app restart reverts.
4. Deep-link overrides emit a visible toast (opt-out) so users notice.

### T10 — Storage key collision with another library

**Actor**: Accidentally malicious third-party library.

**Attack**: Another library writes to the same storage keys and corrupts state.

**Mitigation**: All variantlab storage keys are prefixed with `variantlab:v1:` and validated on read. Unknown keys are ignored. Corrupted values are discarded and re-assigned.

---

## Mitigations

Summarized here in priority order.

### 1. Zero `eval` / zero dynamic code execution

variantlab contains no `eval`, no `new Function()`, no dynamic `import()` of config data, no `setTimeout("string")`, no `setInterval("string")`. This is enforced by an ESLint rule in CI.

### 2. CSP-strict compatible

variantlab works under the most restrictive Content Security Policies:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'
```

No inline scripts, no inline styles, no `unsafe-eval`, no `unsafe-inline`.

### 3. SSR-safe

The core engine is deterministic — the same config + context always produces the same variant. This means hydration never mismatches between server and client, preventing a common attack vector where hydration mismatches can reveal internal state.

### 4. No globals pollution

The engine never writes to `window`, `globalThis`, or `process`. All state is encapsulated in the `VariantEngine` instance.

### 5. Bounded memory

The engine has hard limits on:

- Config size (1 MB)
- Variants per experiment (100)
- Experiments per config (1000)
- Time-travel history (last 1000 events)
- Targeting nesting depth (10)

### 6. Constant-time HMAC verification

Uses `crypto.subtle.verify` which is specified to be constant-time in conforming Web Crypto implementations.

### 7. Origin validation for remote configs

The built-in `createHttpFetcher` supports an allow-list of origins. The engine refuses to load configs fetched from disallowed origins (useful when `fetch` is intercepted).

### 8. Read-only config after load

Once loaded, the `ExperimentsConfig` is frozen via `Object.freeze` recursively. Attempts to mutate it fail silently in loose mode and throw in strict mode.

---

## Security commitments

1. **We will never add telemetry that reports to a server we control.** Not anonymized, not opt-out, never. Telemetry is always user-provided, user-directed, and user-configurable.
2. **We will never add auto-update mechanisms** that fetch new code at runtime. Code changes ship via npm only, with the user's explicit consent.
3. **We will never phone home on import.** The engine does nothing on module load except define classes and functions.
4. **We will publish a full SBOM** with every release.
5. **We will sign every release** via Sigstore and npm provenance.
6. **We will respond to security reports within 48 hours** and publish advisories via GitHub Security Advisories.

---

## Dependency policy

### `@variantlab/core`

- **Runtime dependencies**: **zero**, enforced by CI.
- **Dev dependencies**: allowed, but reviewed.
- **Peer dependencies**: none.

### Adapter packages

- **Runtime dependencies**: exactly one — `@variantlab/core`.
- **Peer dependencies**: the framework (React, Vue, etc.) and optional integrations.
- **Optional peer dependencies** (for storage adapters): marked explicitly as `peerDependenciesMeta.optional = true`.

### Dev tooling

- Dev dependencies are allowed at the workspace root and per package.
- Every dev dependency is audited at install time by `pnpm audit`.
- No dev dependency that has had a CVE in the last 12 months is accepted.

### Rationale

Every runtime dependency is a potential vulnerability. By refusing all runtime dependencies in core, we reduce the audit surface to our own code. For adapters, the single allowed dependency (`@variantlab/core`) is under our direct control.

---

## Supply chain integrity

### Signed releases

Every published package includes:

1. **npm provenance attestation** — ties the published tarball to a specific GitHub Actions workflow run
2. **Sigstore signature** — publicly verifiable via the Sigstore transparency log
3. **CycloneDX SBOM** — complete bill of materials including transitive dev dependencies
4. **SLSA provenance** — level 3 target

Users can verify with:

```bash
npm audit signatures
npx @variantlab/cli verify-release @variantlab/core@0.1.0
```

### Reproducible builds

We commit to making every release reproducible from source:

- Fixed Node version per release (`.nvmrc` committed)
- Lockfile committed (`pnpm-lock.yaml`)
- Build environment documented in `RELEASE.md`
- Anyone can rebuild and compare tarball hashes

### Maintainer security

- All maintainers must use **hardware security keys** (YubiKey or equivalent) for GitHub and npm
- **2FA enforced** on all maintainer accounts
- npm tokens are **scoped and short-lived** (CI-issued, never stored locally)
- GitHub Actions OIDC is used for npm publishing — no long-lived tokens on CI

---

## Privacy commitments

1. **variantlab collects zero data about users, developers, or their apps.** There is no analytics, no anonymous ID, no "just counting downloads", nothing.
2. **variantlab makes zero network requests on its own.** Every network call comes from user-provided `Fetcher` adapters.
3. **variantlab is GDPR / CCPA / LGPD compliant out of the box** — because it has no data to collect.
4. **User IDs passed for sticky hashing are never stored in plaintext** in remote locations. They are hashed client-side before any network call.
5. **Debug overlay state is stored locally only.** QR sharing generates a QR locally and displays it on-device — no upload.

---

## Reporting a vulnerability

**Do not file public GitHub issues for security vulnerabilities.**

Instead, use GitHub Security Advisories: `https://github.com/variantlab/variantlab/security/advisories/new`

Alternatively, email: `security@variantlab.dev` (PGP key in [`SECURITY.asc`](./SECURITY.asc) once published).

Please include:

1. A description of the vulnerability
2. Steps to reproduce
3. Affected package(s) and version(s)
4. The impact (what can an attacker do)
5. (Optional) A proposed fix

We will:

1. Acknowledge receipt within **48 hours**
2. Provide an initial assessment within **7 days**
3. Work with you on a coordinated disclosure timeline
4. Credit you in the advisory (unless you prefer anonymity)

---

## Disclosure policy

We follow a **90-day disclosure window** by default:

- Day 0: vulnerability reported privately
- Day 1-7: triage, assessment, CVSS scoring
- Day 7-60: fix developed, tested, and prepared
- Day 60-80: coordinated disclosure with reporter, pre-announcement to major downstream users
- Day 80-90: public advisory published, patched release shipped

Exceptions:

- **Critical severity + active exploitation**: emergency release within 7 days
- **Low severity**: may be rolled into the next regular release

Advisories are published via:

- GitHub Security Advisories
- CVE assignment (for medium+ severity)
- npm audit database
- Our public changelog

---

## Security audit history

This section will list third-party security audits once we commission them.

| Date | Auditor | Scope | Report |
|---|---|---|---|
| *(planned for post-v1.0)* | TBD | Core engine + HMAC | TBD |

---

## Related documents

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — runtime architecture and data flow
- [`docs/research/security-threats.md`](./docs/research/security-threats.md) — detailed threat research
- [`docs/features/hmac-signing.md`](./docs/features/hmac-signing.md) — HMAC signing implementation
- [`docs/design/config-format.md`](./docs/design/config-format.md) — config schema and validation
