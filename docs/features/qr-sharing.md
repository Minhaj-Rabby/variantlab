# Deep link + QR code state sharing

Share exact variant state between devices via deep links or QR codes. This is the killer collaboration feature for QA and design.

## Table of contents

- [The use case](#the-use-case)
- [The payload format](#the-payload-format)
- [Generating a share](#generating-a-share)
- [Consuming a share](#consuming-a-share)
- [QR codes](#qr-codes)
- [Security](#security)
- [Override rules](#override-rules)
- [Framework integration](#framework-integration)

---

## The use case

A designer sitting next to a developer says:

> "Try the 2-column layout with the small hero image on the profile page."

With traditional A/B tools, the developer opens a dashboard, finds the experiment, changes the variant, and reloads. 30 seconds of friction times 50 tests a day.

With variantlab:

> "Scan this QR code."

The designer holds up their phone with the desired state. The developer scans. The app reloads with the exact variant state in 2 seconds.

---

## The payload format

A share payload is a URL-safe base64-encoded JSON object:

```json
{
  "v": 1,
  "overrides": {
    "news-card-layout": "pip-thumbnail",
    "cta-copy": "try-free",
    "theme": "dark"
  },
  "context": {
    "userId": "qa-tester",
    "attributes": { "betaOptIn": true }
  },
  "expires": 1741040000000
}
```

Fields:

- `v` — payload version (currently `1`)
- `overrides` — map of experiment ID → variant ID
- `context` — (optional) context overrides
- `expires` — (optional) Unix ms timestamp after which the payload is rejected

### Encoding

The payload is:

1. Serialized to compact JSON
2. Gzip-compressed (via `CompressionStream` on web / polyfill on RN)
3. Base64url-encoded (no `=` padding, `+` → `-`, `/` → `_`)

Typical payloads compress to 40-200 bytes. Max supported: 1 KB (rejected otherwise).

---

## Generating a share

### From the debug overlay

Tap "Share state" in the overlay. A modal appears with:

- A QR code for the current state
- A copyable deep link
- An expiration picker (5 min, 1 hour, 1 day, never)
- A lock toggle (prevents further changes after import)

### Programmatically

```ts
import { createShareLink } from "@variantlab/react";

const link = createShareLink({
  overrides: {
    "news-card-layout": "pip-thumbnail",
    "cta-copy": "try-free",
  },
  expires: Date.now() + 60 * 60 * 1000, // 1 hour
  scheme: "drishtikon", // app URL scheme
});

// link = "drishtikon://variantlab?p=eJyrVipILUssys..."
```

### Partial shares

You don't have to include every experiment. Only the ones in `overrides` are affected; others remain on their current assignment.

```ts
createShareLink({
  overrides: { "card-layout": "pip-thumbnail" },
});
// Only changes one experiment
```

---

## Consuming a share

### Deep links

The app registers a URL scheme handler. When a link like `drishtikon://variantlab?p=...` is opened:

1. The adapter intercepts it via `Linking.addEventListener("url")` (RN) or middleware (Next.js)
2. Parses the `p` query parameter
3. Decodes, validates, and applies the payload
4. Shows a confirmation toast

```tsx
import { registerDeepLinkHandler } from "@variantlab/react-native";

useEffect(() => {
  const unregister = registerDeepLinkHandler({
    scheme: "drishtikon",
    onApply: (payload) => {
      console.log("Applied variant overrides:", payload.overrides);
    },
  });
  return unregister;
}, []);
```

### Manual apply

```ts
const engine = useVariantLabEngine();
const payload = decodeShareLink(link);
engine.applyOverrides(payload.overrides);
```

### Confirmation before apply

For safety, especially in production, show a confirmation dialog:

```tsx
registerDeepLinkHandler({
  scheme: "drishtikon",
  confirmBeforeApply: true,
});
```

The adapter shows a modal with the experiments being changed. The user taps "Apply" or "Cancel".

---

## QR codes

### Why QR

Phone-to-phone sharing is often harder than phone-to-phone deep linking:

- Airdrop is iOS-only
- Messaging apps strip URLs
- Pasting into the other device takes time

QR codes are instant, universal, and work across platforms.

### Generating QR codes

variantlab does **not** bundle a QR code library. The overlay uses a minimal hand-rolled QR encoder (~2 KB) that produces a data URL:

```ts
import { createQRCode } from "@variantlab/react-native/qr";

const qr = createQRCode(shareLink, { size: 256, errorCorrection: "M" });
// qr = "data:image/svg+xml;base64,..."
```

Errors correction levels: L (low), M (medium), Q (quartile), H (high). Default: M.

### Reading QR codes

Each adapter provides a helper to read QRs using the native camera:

```tsx
import { VariantQRScanner } from "@variantlab/react-native";

<VariantQRScanner
  onScan={(payload) => {
    engine.applyOverrides(payload.overrides);
  }}
  onError={(error) => console.warn(error)}
/>
```

The scanner uses `expo-barcode-scanner` on Expo and `react-native-vision-camera` elsewhere. These are **peer dependencies** — variantlab does not bundle them.

---

## Security

Share payloads are user-generated content. We assume they may be malicious.

### Validation

Every payload is validated before applying:

- Must have `v: 1`
- `overrides` must be an object of string keys to string values
- `overrides` max 100 entries
- Each key must be a valid experiment ID (regex match)
- Each value must be a valid variant ID (regex match)
- `context` fields must pass the context schema
- Total payload size < 1 KB decoded
- No prototype pollution keys (`__proto__`, `constructor`, etc.)

### Optional HMAC signing

Shares can be signed with HMAC-SHA256 using a pre-shared key:

```ts
const link = createShareLink({
  overrides: { ... },
  signWith: process.env.SHARE_KEY,
});
```

When the adapter imports a signed payload, it verifies the signature before applying:

```ts
registerDeepLinkHandler({
  scheme: "drishtikon",
  requireSignature: true,
  hmacKey: process.env.SHARE_KEY,
});
```

Unsigned payloads are rejected in strict mode.

### Overridable flag

Experiments with `overridable: false` cannot be overridden via shares. This is the default for all experiments — you must explicitly opt-in:

```json
{
  "id": "ai-assistant-beta",
  "overridable": true,
  "variants": [...]
}
```

Non-overridable experiments are silently ignored in the share payload. This lets you mark experiments as "safe for QA" without worrying about other experiments being abused.

### Expiration

Payloads with an `expires` timestamp in the past are rejected. The overlay defaults to 1-hour expiration.

### Rate limiting

The adapter debounces deep link imports to at most 1 per second to prevent override flooding from malicious deep links.

### Production safety

In production:

- Deep link handler is off by default — must be explicitly enabled
- Requires `requireSignature: true`
- Shows a confirmation dialog before applying
- Logs every applied override (without PII)

---

## Override rules

Once a share is applied, overrides take precedence over:

- Targeting (even if targeting fails)
- Assignment (even if weighted)
- Default (even on new users)

But **not** over:

- Kill switch (`enabled: false` at the config level)
- Archived experiments (`status: "archived"`)
- `overridable: false`

Overrides persist in Storage so they survive app restart. The user can clear them:

- Via the debug overlay → "Reset all"
- Programmatically: `engine.resetAll()`
- By scanning a new share with empty overrides

---

## Framework integration

### React Native (Expo)

```tsx
import { Linking } from "react-native";
import { registerDeepLinkHandler } from "@variantlab/react-native";

// Register once at app startup
registerDeepLinkHandler({ scheme: "drishtikon" });

// Expo requires the scheme in app.json:
// "expo": { "scheme": "drishtikon" }
```

### Next.js

```tsx
// app/variantlab/apply/page.tsx
import { applyShareLinkFromURL } from "@variantlab/next";

export default function Apply({ searchParams }) {
  applyShareLinkFromURL(searchParams.p);
  return <Redirect to="/" />;
}
```

Next.js doesn't have a native deep link concept, so we use a dedicated route that applies the override and redirects.

### Vue / Nuxt

```ts
// app.vue
import { registerDeepLinkHandler } from "@variantlab/vue";

onMounted(() => {
  registerDeepLinkHandler({ param: "variantlab" });
});
```

### Svelte / SvelteKit

```svelte
<!-- +layout.svelte -->
<script>
  import { registerDeepLinkHandler } from "@variantlab/svelte";
  registerDeepLinkHandler({ param: "variantlab" });
</script>
```

---

## Advanced: collaborative sessions

A future feature: live-sync sessions where a designer's overlay state mirrors on a developer's phone in real time.

Implementation sketch (not in v0.1):

- QR encodes a session ID instead of a payload
- App connects to a user-provided WebSocket server (no hosted version)
- Overlay broadcasts state changes to the session
- Other clients in the session apply the changes live

This is intentionally deferred to post-1.0 — it adds complexity and requires either a hosted service (against principle 7) or user-hosted infrastructure.

---

## See also

- [`debug-overlay.md`](./debug-overlay.md) — where the share UI lives
- [`hmac-signing.md`](./hmac-signing.md) — signing payloads
- [`API.md`](../../API.md) — `createShareLink`, `registerDeepLinkHandler`
