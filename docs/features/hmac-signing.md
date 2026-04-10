# HMAC-signed remote configs

Tamper-proof remote config delivery via HMAC-SHA256 signatures verified with Web Crypto API.

## Table of contents

- [Why signing matters](#why-signing-matters)
- [The threat model](#the-threat-model)
- [How it works](#how-it-works)
- [Generating a signature](#generating-a-signature)
- [Verifying a signature](#verifying-a-signature)
- [Key management](#key-management)
- [What signing does NOT protect](#what-signing-does-not-protect)
- [Deployment workflow](#deployment-workflow)

---

## Why signing matters

When your app fetches `experiments.json` from a remote URL, anyone who can intercept that request can modify the config. That includes:

- MITM attackers on public Wi-Fi
- Compromised CDNs
- DNS hijacking
- Rogue employees with deploy access
- Supply chain attackers in your build pipeline

A modified config can:

- Enable features meant for staging
- Change pricing
- Collect user data (if combined with telemetry)
- Break the app via invalid variants

TLS is **not sufficient**. TLS protects the transport, not the content. If the attacker compromises your CDN or your S3 bucket, they ship the config over TLS just like you do.

HMAC signing protects the **content** regardless of how it was transported.

---

## The threat model

variantlab signing defends against:

- **T1**: Malicious remote config (CDN compromise, MITM, internal rogue) — mitigated by signing
- **T2**: Tampered local storage (malicious app, device compromise) — out of scope (TLS + signing both fail)
- **T8**: Unauthorized variant overrides via deep link — mitigated via the same HMAC mechanism on share payloads

See [`SECURITY.md`](../../SECURITY.md) for the full threat table.

---

## How it works

### Signing

1. Developer writes `experiments.json`
2. `variantlab sign experiments.json --key $SECRET` computes HMAC-SHA256 over the canonical JSON form
3. The CLI writes the signature into the `signature` field of the JSON
4. The signed file is deployed to the CDN

### Verification

1. App fetches the signed JSON
2. Engine extracts the `signature` field and strips it from the JSON
3. Engine computes HMAC-SHA256 over the canonical form of the remaining JSON
4. Engine compares the computed signature with the provided signature using `crypto.subtle.verify` (constant time)
5. If they match, the config is applied. If not, the config is rejected and the engine falls back to the bundled config.

### Canonical form

HMAC requires a deterministic byte representation of the input. We define the canonical form as:

- UTF-8 encoding
- Keys sorted lexicographically at every level
- No whitespace
- `"\u"` escapes normalized
- Signature field removed before signing/verifying

This matches [RFC 8785 (JSON Canonicalization Scheme)](https://www.rfc-editor.org/rfc/rfc8785).

---

## Generating a signature

### CLI

```bash
# Set the key via env var
export VARIANTLAB_HMAC_KEY=mysecret123

# Sign the file in place
variantlab sign experiments.json

# Or pipe
cat experiments.json | variantlab sign --key $VARIANTLAB_HMAC_KEY > signed.json
```

### Programmatically

```ts
import { signConfig } from "@variantlab/cli";

const signed = await signConfig(config, {
  key: process.env.VARIANTLAB_HMAC_KEY,
});
// signed.signature = "base64url-encoded-signature"
```

### Output format

```json
{
  "$schema": "https://variantlab.dev/schemas/experiments.schema.json",
  "version": 1,
  "signature": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  "experiments": [...]
}
```

The signature is the base64url-encoded HMAC-SHA256 of the canonical form (with `signature` field excluded).

---

## Verifying a signature

### At engine creation

```ts
import { createEngine } from "@variantlab/core";

const engine = createEngine(config, {
  hmacKey: process.env.NEXT_PUBLIC_VARIANTLAB_KEY,
  onSignatureFailure: "reject", // or "warn"
});
```

- `"reject"` — reject the config, fall back to the bundled one, emit a warning
- `"warn"` — log a warning but still apply the config (useful for soft rollouts of signing)

### With remote fetching

```ts
import { createHttpFetcher } from "@variantlab/core/fetcher";

const fetcher = createHttpFetcher({
  url: "https://cdn.example.com/experiments.json",
  headers: { "Cache-Control": "no-cache" },
});

const engine = createEngine(initialConfig, {
  fetcher,
  hmacKey: "mysecret",
  pollInterval: 60000,
});
```

Every fetched config is verified before being applied.

### Manual verification

```ts
import { verifySignature } from "@variantlab/core/crypto";

const isValid = await verifySignature(config, key);
if (!isValid) {
  throw new Error("Config signature invalid");
}
```

---

## Key management

The HMAC key is a shared secret between:

1. The build system that signs configs
2. The client app that verifies them

### Where to store the key

**On the build system**:

- Environment variable in CI (`VARIANTLAB_HMAC_KEY`)
- Secrets manager (AWS Secrets Manager, Vault, GCP Secret Manager)
- **Never** commit to git

**On the client**:

- Embedded at build time via env var (`NEXT_PUBLIC_VARIANTLAB_KEY`)
- The key is visible in the client bundle — treat it as a shared secret, not a private key
- **This means**: anyone who reverse-engineers your app can extract the key

### Why is that OK?

HMAC is not authenticating the user; it's authenticating the **config source**. Even if an attacker extracts the key, they still can't:

- Push a signed config to your CDN (they'd need deploy access)
- Forge a config that your CDN serves (it's the CDN's bytes, not theirs)

The only attack the extracted key enables is: the attacker signs their own config and somehow gets your app to fetch it (e.g., via a malicious deep link with a custom fetcher). That's a multi-step attack that signing alone can't prevent.

### If you need key secrecy

If you absolutely need the key to be secret:

- Fetch the config from your authenticated API instead of a public CDN
- Use TLS pinning in the fetcher
- Sign with a rotating key that's fetched from a secure endpoint

This is out of scope for variantlab core. We provide the primitives; you compose the policy.

### Key rotation

To rotate:

1. Generate a new key
2. Update the build system to sign with the new key
3. Ship an app update with the new key
4. Wait for the old app version to age out
5. Retire the old key

The engine supports **multiple keys** for smooth rotation:

```ts
createEngine(config, {
  hmacKeys: [
    { id: "v2", key: currentKey },
    { id: "v1", key: previousKey },
  ],
});
```

The config's `signature` field can optionally include a key ID prefix: `"v2:dBjftJeZ..."`. The engine looks up the matching key.

---

## What signing does NOT protect

### Replay attacks

An old signed config is still valid. An attacker who captures `experiments.v1.json` can replay it later even after you've shipped `experiments.v2.json`.

**Mitigation**: include a `nonce` or `timestamp` field in the config and reject old ones in the engine options. Post-v0.1.

### Rollback to an older version

Related to replay. If the attacker serves an older signed config with a lower `version`, the engine may accept it.

**Mitigation**: the engine tracks the highest version it has seen and rejects configs with lower versions.

### Key compromise

If the HMAC key leaks, the attacker can sign arbitrary configs. Rotate the key immediately.

### Bundled config tampering

The bundled `experiments.json` (shipped inside the app binary) is not signed at runtime — if someone tampers with the app bundle, they can replace it. This is out of scope — if an attacker can modify your app binary, they can do far worse than change experiments.

### DoS via malformed signature

A config with an invalid signature is rejected, and the engine falls back. This is the correct behavior — it's not a vulnerability. But it does mean an attacker who can serve configs can deny new ones.

**Mitigation**: pin the last-known-good config in Storage and apply it if the fetched one fails verification.

---

## Deployment workflow

The canonical flow for signed remote configs:

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Developer    │   │ CI           │   │ CDN          │   │ User device  │
│ edits json   │──▶│ signs json   │──▶│ serves json  │──▶│ verifies     │
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
```

### Example GitHub Actions workflow

```yaml
name: Deploy experiments
on:
  push:
    paths: ['experiments.json']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install variantlab CLI
        run: npm install -g @variantlab/cli

      - name: Validate config
        run: variantlab validate experiments.json

      - name: Sign config
        run: variantlab sign experiments.json --out signed.json
        env:
          VARIANTLAB_HMAC_KEY: ${{ secrets.VARIANTLAB_HMAC_KEY }}

      - name: Upload to S3
        run: aws s3 cp signed.json s3://config.example.com/experiments.json
          --cache-control "max-age=60"
```

### CDN cache control

Signed configs should have a short cache TTL (e.g., 60s) so that config updates propagate quickly. The engine's `pollInterval` should match or be slightly longer.

---

## Cost of signing

- **Bundle size**: ~300 bytes (Web Crypto API has no bundle cost; we only ship the canonicalizer and the verify wrapper)
- **Runtime**: HMAC verification takes ~1 ms on a modern device
- **Build time**: Signing takes < 100 ms

Signing is cheap. There's no reason not to turn it on for production remote configs.

---

## See also

- [`SECURITY.md`](../../SECURITY.md) — threat model
- [`config-format.md`](../design/config-format.md) — the `signature` field
- [`API.md`](../../API.md) — `signConfig`, `verifySignature`
- [RFC 8785 — JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)
