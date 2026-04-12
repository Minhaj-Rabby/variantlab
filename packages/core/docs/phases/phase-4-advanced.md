# Phase 4 — Advanced (v0.4)

**Status**: Not started
**Goal**: Ship the features that differentiate variantlab from every free tool and most paid ones.
**Target version**: `0.4.0`

## Table of contents

- [Exit criteria](#exit-criteria)
- [HMAC-signed configs](#hmac-signed-configs)
- [Crash rollback persistence](#crash-rollback-persistence)
- [Time-travel replay](#time-travel-replay)
- [Statistical tools](#statistical-tools)
- [Remote config improvements](#remote-config-improvements)
- [Security hardening](#security-hardening)
- [Milestones](#milestones)

---

## Exit criteria

Phase 4 is done when:

1. `variantlab sign` CLI command ships with tests
2. Engine verifies signatures via Web Crypto API on all runtimes
3. Crash rollback is persistent across sessions when configured
4. Time travel "replay" mode works (read-only variant history replay)
5. `variantlab distribution` grows into a proper stats tool
6. SSE / WebSocket config push is GA (if phase 2 was experimental)
7. A third-party security audit is initiated
8. The devtools extension goes from beta to stable
9. All phase 4 features are documented with examples

---

## HMAC-signed configs

See [`hmac-signing.md`](../features/hmac-signing.md) for the full spec. Phase 4 ships:

### Core

- [ ] `verifySignature(config, key)` using Web Crypto API
- [ ] Canonical JSON form per RFC 8785
- [ ] Key rotation support (multiple keys, key ID prefix)
- [ ] `onSignatureFailure: "reject" | "warn"` modes
- [ ] Constant-time verification (from Web Crypto, not hand-rolled)
- [ ] Tests covering: valid sig, invalid sig, missing sig, tampered body, wrong key

### CLI

- [ ] `variantlab sign <file> [--out <file>] [--key <env>]`
- [ ] `variantlab verify <file> [--key <env>]`
- [ ] `variantlab rotate-key` helper
- [ ] Exit codes per docs

### Integration

- [ ] Example GitHub Actions workflow that signs on merge
- [ ] Example S3 + CloudFront deployment guide
- [ ] Example Cloudflare Workers deployment with KV key storage
- [ ] Documentation of the threat model

---

## Crash rollback persistence

See [`crash-rollback.md`](../features/crash-rollback.md). Phase 4 finalizes:

### Core

- [ ] Rollback state persisted to Storage
- [ ] Rollback state cleared on config version bump
- [ ] Rollback state cleared on manual reset
- [ ] `persistent: "forever"` option (never auto-clear)
- [ ] Engine emits `rollback` events with full context
- [ ] `engine.getRollbacks()` returns all active rollbacks
- [ ] `engine.clearRollback(id)` clears one

### Adapters

- [ ] `<VariantErrorBoundary>` refined with custom fallback
- [ ] Automatic crash reporting forward to Telemetry
- [ ] Native iOS crash hook (via NSException → JS)
- [ ] Native Android crash hook (via UncaughtExceptionHandler → JS)
- [ ] Integration with `sentry-expo` (user-supplied adapter)

### Debug overlay

- [ ] History tab shows rollback events prominently
- [ ] "Clear rollback" button per experiment
- [ ] Simulate rollback button (dev only) for testing

---

## Time-travel replay

See [`time-travel.md`](../features/time-travel.md). Phase 4 ships the replay mode:

### Core

- [ ] `replaySession(history, newConfig)` pure function
- [ ] Diff output: which experiments change assignment under new config
- [ ] Export session as JSON
- [ ] Import session from JSON
- [ ] Persistent history (optional)

### Debug overlay

- [ ] Replay tab in the overlay
- [ ] "Import session" file picker
- [ ] Scrubber for time-based navigation
- [ ] "Apply this state" button

### Use cases

- Regression testing configs before shipping
- Reproducing user bug reports
- Migration validation

---

## Statistical tools

### `variantlab distribution` improvements

- [ ] Bootstrap simulation (10,000 users by default)
- [ ] Bucket deviation analysis
- [ ] Chi-square test for assignment uniformity
- [ ] JSON output for CI integration

### `variantlab sample-size` — NEW

Compute the sample size needed to detect a given effect size:

```bash
variantlab sample-size --baseline 0.10 --effect 0.02 --power 0.8
```

Output: minimum users per arm.

### `variantlab power` — NEW

Compute statistical power given observed sample size:

```bash
variantlab power --baseline 0.10 --variant 0.12 --users 1000
```

### Not shipping

- [ ] ❌ No t-tests / z-tests on actual user data (we don't collect data)
- [ ] ❌ No dashboard for "how is my experiment doing" (we have no data to show)
- [ ] ❌ No auto-decision logic (that's a telemetry tool's job)

We ship **pre-launch planning tools**, not runtime stats.

---

## Remote config improvements

### SSE GA

- [ ] Production-ready `createEventSourceFetcher`
- [ ] Automatic reconnection with exponential backoff
- [ ] Connection state in debug overlay
- [ ] Tests against a test SSE server

### Partial config updates

- [ ] Support delta updates: server sends only changed experiments
- [ ] Merge logic in the engine
- [ ] Reduces bandwidth for frequent pushes

### Config versioning

- [ ] Engine tracks the config version hash
- [ ] `If-None-Match` + ETag support in `createHttpFetcher`
- [ ] 304 responses don't reload

### Config caching

- [ ] Pluggable cache backends (LRU in-memory, LocalStorage, AsyncStorage)
- [ ] Cache TTL per config
- [ ] Manual cache invalidation

---

## Security hardening

### Third-party audit

- [ ] Engage a security firm for an audit of the core engine
- [ ] Focus areas: prototype pollution, HMAC verification, config parsing, DoS vectors
- [ ] Publish the audit report

### Fuzz testing

- [ ] Integrate with OSS-Fuzz or a custom fuzzer
- [ ] Fuzz the config parser, targeting evaluator, and HMAC verifier
- [ ] Run fuzz tests in CI nightly

### Supply chain

- [ ] All releases signed with Sigstore
- [ ] SBOMs published per release
- [ ] Provenance attestation via GitHub Actions OIDC
- [ ] SLSA level 3 compliance

### CSP strict mode

- [ ] Verify variantlab works in CSP-strict environments
- [ ] Document CSP headers users should set
- [ ] Tests that exercise CSP violations

---

## Milestones

### M1: HMAC signing end-to-end

- Signer
- Verifier
- CLI commands
- Canonicalization
- Tests
- Deployment guide

Gate: a signed config fetched from a CDN is verified on mobile and rejected if tampered.

### M2: Crash rollback persistence

- Storage integration
- Error boundary refinement
- Native crash hooks
- Debug overlay integration
- Tests

Gate: a crashing variant auto-rolls back within 3 crashes; rollback survives app restart; a config update clears it.

### M3: Time travel replay

- Replay pure function
- Diff output
- Debug overlay UI
- Tests

Gate: a recorded session can be replayed against a different config and the diffs are accurate.

### M4: Statistical tools

- Distribution bootstrap
- Sample size calculator
- Power analysis
- Tests

Gate: sample-size output matches published statistical tables for common inputs.

### M5: Security audit + hardening

- Engage auditor
- Address findings
- Publish report
- Fuzz integration

Gate: audit finds no high/critical issues (or they're fixed before release).

### M6: v0.4.0 release

- All features shipped
- Docs updated
- Migration guide
- Blog post

---

## Risks

### Risk: HMAC canonicalization bugs

Mitigation: use RFC 8785 and test against the published test vectors. Don't hand-roll canonicalization rules.

### Risk: Persistent rollback never clears

Mitigation: hard cap on persistent rollback duration (e.g., 7 days) unless explicitly opted in. Clear on config version bump.

### Risk: Security audit surfaces architectural issues

Mitigation: the earlier we audit, the cheaper it is to fix. Phase 4 is the right time because the API is stable but not yet v1.

### Risk: Time travel replay doesn't match real behavior

Mitigation: replay is read-only and runs the same evaluation code as the engine. If it diverges, that's a bug we fix.

---

## Transition to phase 5

Phase 4 exits when:

- All advanced features GA
- Security audit complete
- Devtools extension stable
- v0.4.0 published
- Community is using advanced features in production

Phase 5 is the v1.0 stable release: API freeze, long-term support commitment, and polish. See [`phase-5-v1-stable.md`](./phase-5-v1-stable.md).
