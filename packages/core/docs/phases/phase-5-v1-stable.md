# Phase 5 — v1.0 Stable

**Status**: Not started
**Goal**: Freeze the public API, commit to long-term support, and polish for a stable release.
**Target version**: `1.0.0`

## Table of contents

- [Exit criteria](#exit-criteria)
- [API freeze](#api-freeze)
- [LTS commitment](#lts-commitment)
- [Polish](#polish)
- [Marketing / launch](#marketing--launch)
- [Governance](#governance)
- [Milestones](#milestones)
- [Post-1.0 roadmap](#post-10-roadmap)

---

## Exit criteria

Phase 5 is done when:

1. Every public API is documented with examples
2. Every public API is type-safe and has test coverage > 95%
3. Every adapter has a working example app in `examples/`
4. All known bugs with labels `bug` and severity `high` are fixed
5. The npm package metadata is complete (keywords, repository, homepage, author, license)
6. Public docs site is live (optional — README is enough)
7. Security audit findings are all resolved
8. v1.0.0 tag is published
9. A public announcement is made (blog post, HN, Reddit, Twitter)
10. At least one case study from a non-Drishtikon user is documented

---

## API freeze

The public API becomes stable at v1.0. Breaking changes require a major version bump and a formal RFC.

### What "stable" means

- **Types**: adding new fields to interfaces is fine. Removing or changing existing fields is breaking.
- **Hooks**: the signature cannot change. New overloads can be added.
- **Components**: the prop names cannot change. New props can be added.
- **Config**: `version: 1` remains supported forever.
- **Core engine**: the `VariantEngine` interface cannot change.

### Deprecation policy

- Deprecated APIs emit a console warning in dev builds
- Deprecated APIs remain functional for at least one major version
- Deprecations are documented in the changelog
- Replacement APIs are documented in the deprecation notice

### What's NOT stable

- Internal APIs (modules under `@variantlab/core/internal`)
- Debug overlay UI (can change look/feel in minor releases)
- CLI output format (can improve in minor releases)
- Error message text (but not error types)

---

## LTS commitment

v1.0 comes with a Long-Term Support commitment:

- **Security patches**: for the latest 2 major versions
- **Bug fixes**: for the latest major version
- **Performance improvements**: for the latest major version
- **New features**: only in the latest major version

### v1.x line

- Minor versions (`1.1`, `1.2`, ...) — new features, backward-compatible
- Patch versions (`1.0.1`, `1.0.2`, ...) — bug fixes only
- Security patches for v1.x continue until v3.0 ships

### Migration assurance

Users on v1.x will never be forced to upgrade to v2.x. When v2 ships, we'll:

1. Document the breaking changes
2. Ship a `variantlab migrate` command
3. Support v1.x for at least 12 months after v2 ships

---

## Polish

### Documentation

- [ ] Every exported function has a JSDoc comment with an example
- [ ] Every type has a comment explaining its purpose
- [ ] The `docs/` tree is navigable with a table of contents
- [ ] `CHANGELOG.md` is up to date and formatted cleanly
- [ ] `README.md` screenshots/GIFs are updated
- [ ] Typos are fixed (we'll run a pass with a spell-checker)

### Error messages

- [ ] Every error message includes a docs link
- [ ] Every error has a unique code (e.g., `E_CONFIG_INVALID`)
- [ ] Error codes are documented in `docs/errors.md`
- [ ] Errors suggest fixes when possible

### Performance

- [ ] Run benchmarks across all hot paths
- [ ] Publish benchmark results in `docs/performance.md`
- [ ] Compare against LaunchDarkly, Firebase, GrowthBook (where possible)
- [ ] Target: core evaluation < 10 µs per experiment

### Bundle size

- [ ] Final size audit
- [ ] Publish bundle size analysis for every package
- [ ] Compare against competitors
- [ ] Target: core < 3 KB gzipped

### DX

- [ ] IDE autocomplete works smoothly with codegen
- [ ] TypeScript error messages are helpful, not cryptic
- [ ] `variantlab init` produces a working project
- [ ] Example apps are deployable with one command

---

## Marketing / launch

### Pre-launch

- [ ] Beta release (1.0.0-beta.1) shared with a small group
- [ ] Collect feedback for 2-4 weeks
- [ ] Fix issues
- [ ] Release candidate (1.0.0-rc.1)

### Launch

- [ ] Blog post: "Introducing variantlab"
- [ ] Hacker News post
- [ ] Reddit: r/reactnative, r/webdev, r/javascript, r/typescript
- [ ] Twitter/X thread
- [ ] Product Hunt launch
- [ ] Dev.to cross-post
- [ ] Mailing list announcement (if we have one)

### Materials

- [ ] Logo (simple, recognizable)
- [ ] Social card images
- [ ] Demo video (< 2 minutes, shows the debug overlay in action)
- [ ] Example gallery

### Press targets (stretch)

- [ ] React Newsletter
- [ ] JavaScript Weekly
- [ ] Bytes.dev
- [ ] This Week in React

### Anti-marketing

Things we **won't** do:

- ❌ Launch a mailing list to nag users
- ❌ Buy ads
- ❌ Sponsor influencers
- ❌ Gate features behind "contact sales"
- ❌ Claim unverified benchmarks

---

## Governance

### Maintainers

At v1.0, we formalize the maintainer list:

- [ ] At least 2 maintainers with publish access (avoid bus factor of 1)
- [ ] Maintainer responsibilities documented in `GOVERNANCE.md`
- [ ] Code review policy: 1 approval for minor changes, 2 for breaking

### Decision-making

- Minor changes: maintainer discretion
- Major changes: RFC process
- Breaking changes: RFC + 2 maintainer approvals + community discussion

### RFC process

- RFCs filed as GitHub issues with the `rfc` label
- Minimum 1 week open for comment
- Final decision recorded in the issue
- Implementation PR links back to the RFC

### Code of conduct

- [ ] Adopt the Contributor Covenant v2.1
- [ ] Publish enforcement guidelines
- [ ] Designate a CoC response team

### Security policy

- [ ] `SECURITY.md` specifies the reporting flow
- [ ] Dedicated security contact (email or form)
- [ ] 90-day disclosure window
- [ ] CVE assignment for critical issues

---

## Milestones

### M1: API freeze audit

- Review every exported API
- Remove internal APIs from the public surface
- Document every public API
- Tag release candidate

### M2: Polish pass

- Fix every `bug`-labeled issue
- Improve error messages
- Update docs

### M3: Beta → RC

- Ship beta to small group
- Collect feedback
- Fix issues
- Ship RC

### M4: Security audit wrap-up

- Resolve any remaining audit findings
- Publish audit report

### M5: Launch

- Publish v1.0.0
- Blog post
- Social posts
- HN + Reddit
- PH launch

### M6: Post-launch

- Monitor issues
- Address launch-day bugs
- Write retrospective

---

## Post-1.0 roadmap

Ideas for v1.x and beyond, not committed:

### v1.1: Quality of life

- Better error messages
- More example apps
- More documentation
- Community-contributed adapters

### v1.2: Advanced targeting

- Time-based interpolation (rollout curves)
- Geolocation via adapter
- Device capability targeting (GPU tier, RAM)

### v1.3: Analytics integration

- First-class adapters for PostHog, Mixpanel, Amplitude, Segment
- Exposure deduplication
- Funnel-aware targeting

### v1.4: Collaborative sessions

- Real-time multi-device sync (self-hosted)
- Session sharing for design review
- Multi-user debug overlay

### v1.5: Cohort targeting

- User cohorts defined as saved queries
- Cross-experiment cohort reuse

### v2.0 (speculative)

- Schema v2 with breaking improvements informed by v1 usage
- Formal migration tooling
- Possible rename of some types if v1 names turned out to be wrong
- Released only when v1 has clear limitations, not on a calendar

### Things we'll never add

- ❌ A hosted SaaS dashboard
- ❌ Default telemetry
- ❌ A full expression language in JSON
- ❌ Proprietary features
- ❌ Paid tiers

---

## The v1.0 contract

At v1.0, we commit to our users:

1. **The public API is stable.** Breaking changes require a major version.
2. **Security patches continue for the latest 2 majors.**
3. **No telemetry will ever be added without explicit opt-in.**
4. **No paid tier will ever gate existing functionality.**
5. **The license stays MIT.** Always.
6. **The repo stays open source.** Always.
7. **The code stays hand-reviewed.** No auto-merge bots touching source.
8. **The size budgets stay.** If a feature can't fit, it doesn't ship.
9. **The framework list keeps growing.** We accept reasonable framework adapter contributions.
10. **Docs remain first-class.** Every feature ships with its spec.

---

## Definition of done

Phase 5 is done when:

- v1.0.0 is published on npm
- The README, docs, and examples match reality
- A user can go from `npm install @variantlab/react` to a working experiment in under 5 minutes
- The project has survived its first launch-day traffic without breaking
- The maintainer team is comfortable with ongoing stewardship

When all 5 are true, variantlab is a mature, stable open source project. We shift to maintenance + incremental improvement mode.

---

## Anti-goals for phase 5

Things we deliberately avoid at v1.0:

- ❌ Shipping "just one more feature" that isn't in the phase plan
- ❌ Rushing the release to hit an arbitrary date
- ❌ Skipping the security audit
- ❌ Over-promising on post-1.0 features
- ❌ Hiring a community manager
- ❌ Setting up a Discord (we use GitHub discussions)

Quality > velocity at v1.0.
