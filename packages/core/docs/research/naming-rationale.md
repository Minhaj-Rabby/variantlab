# Naming rationale

Why `variantlab`, what we considered, and what still needs validation.

## Table of contents

- [Current pick](#current-pick)
- [Requirements](#requirements)
- [Candidates considered](#candidates-considered)
- [Why variantlab won](#why-variantlab-won)
- [Risks](#risks)
- [Final validation checklist](#final-validation-checklist)

---

## Current pick

**`variantlab`** — npm scope `@variantlab/*`, domain `variantlab.dev`.

The name captures three things:

1. **Variant** — the unit of work. Not "flags", not "experiments", not "tests". A variant is a thing a user sees.
2. **Lab** — a place for controlled experimentation. Evokes the scientific rigor we want to bring to UX.
3. **Neutral** — works for feature flags, A/B tests, gradual rollouts, and UX experiments alike.

---

## Requirements

Before deciding, we listed what the name had to support:

1. **Short enough to type** — under 12 characters ideally
2. **Available on npm** — the `@name/*` scope must be free
3. **Available domain** — `.dev` or `.io` at minimum
4. **Available on GitHub** — organization name free
5. **Pronounceable** — non-native English speakers can say it
6. **Not a trademark** — no existing company with a clashing name
7. **Memorable** — sticks in the head
8. **Searchable** — has unique search results, not drowned by a common word
9. **Extensible** — `@name/core`, `@name/react`, etc. all read well
10. **Neutral connotation** — no religion, no politics, no culture-specific meanings

---

## Candidates considered

We went through ~30 names. Here are the serious contenders:

### `variantlab`

**Pros**: Captures the concept, neutral, scientific, 10 chars, `@variantlab/react` reads well.
**Cons**: Slightly generic, may be confused with lab equipment brands.
**npm `@variantlab` scope**: needs to be claimed.
**variantlab.dev**: needs to be registered.

### `flagkit`

**Pros**: Very short (7 chars), memorable, "kit" implies bundled tools.
**Cons**: "flag" has political/territorial connotations that could be misread. Narrows the concept to feature flags when we want to cover A/B testing, gradual rollout, and UI experiments.
**Verdict**: Too narrow.

### `shift`

**Pros**: 5 chars, bold, evokes "shifting variants".
**Cons**: Almost certainly taken on npm. Overloaded meaning (keyboard shift, shift left, etc.).
**Verdict**: Too common.

### `omniflag`

**Pros**: "Omni" captures universal framework support.
**Cons**: 8 chars + "flag" issue. Sounds like an enterprise brand.
**Verdict**: Too corporate.

### `polyvariant`

**Pros**: Scientific, captures multi-variant testing, unique.
**Cons**: 11 chars + hard to spell + "poly" sounds prefix-y.
**Verdict**: Too academic.

### `labkit`

**Pros**: Short, evokes tooling.
**Cons**: Almost certainly taken (common laboratory supply brand).
**Verdict**: Trademark risk.

### `flaglab`

**Pros**: Combines "flag" and "lab".
**Cons**: Narrow (see flag issue), and npm scope likely taken.
**Verdict**: Ruled out.

### `expt`

**Pros**: 4 chars, techy.
**Cons**: Looks like a typo. Hard to pronounce.
**Verdict**: Too cute.

### `variox`

**Pros**: Unique, 6 chars, no existing trademark.
**Cons**: Invented word, not immediately meaningful.
**Verdict**: Backup option.

### `hypothesize`

**Pros**: Scientific, unique.
**Cons**: 11 chars, hard to type repeatedly.
**Verdict**: Too long.

### `tryout`

**Pros**: Short, friendly, captures "trying variants".
**Cons**: Lacks technical gravitas, probably taken.
**Verdict**: Too casual.

### `abx`

**Pros**: 3 chars, technical.
**Cons**: Mysterious, not memorable, possibly medical connotation (antibiotic).
**Verdict**: Too cryptic.

### `testlab`

**Pros**: Self-explanatory.
**Cons**: Generic, "test" is overloaded with unit testing. Probably taken.
**Verdict**: Too generic.

### `switchboard`

**Pros**: Evokes a control panel.
**Cons**: 11 chars, dated metaphor.
**Verdict**: Too long.

### `stageset`

**Pros**: Evokes staging variants.
**Cons**: Unclear meaning, 8 chars.
**Verdict**: Confusing.

### `exposure`

**Pros**: Technical term from experimentation (exposure events).
**Cons**: 8 chars, also has negative connotations (exposure to risk, exposure of data).
**Verdict**: Mixed signal.

---

## Why variantlab won

Looking at the shortlist:

| Name | Length | Meaningful | Neutral | Extensible | Available? |
|---|---:|:-:|:-:|:-:|:-:|
| variantlab | 10 | ✅ | ✅ | ✅ | TBD |
| polyvariant | 11 | ✅ | ✅ | ✅ | Likely |
| variox | 6 | Partial | ✅ | ✅ | Likely |
| flagkit | 7 | Narrow | Neutral | ✅ | TBD |
| shift | 5 | Partial | ✅ | ❌ | Unlikely |

`variantlab` edges out `polyvariant` on pronounceability and `variox` on meaning. It beats `flagkit` by not pigeonholing us into feature flags.

The package-family reads nicely:

- `@variantlab/core`
- `@variantlab/react`
- `@variantlab/react-native`
- `@variantlab/next`
- `@variantlab/cli`
- `@variantlab/devtools`

The tagline writes itself: *"Every framework. Zero lock-in. One lab."*

---

## Risks

### Risk 1 — npm scope taken

We need to verify `@variantlab` is free on npm before committing. If it's taken but inactive, we might be able to request it via npm support. If actively used, we need a backup.

**Backup plan**: If `@variantlab` is unavailable, fall back to `@variox/*` or `@lab-variant/*`.

### Risk 2 — trademark conflict

"Variant Lab" may exist as a company name in biotech or marketing. We need a trademark check before launching publicly.

**Backup plan**: Add a distinctive suffix if needed (`variantlab.dev` domain clarifies context).

### Risk 3 — SEO

"variant" and "lab" are both common words. Initial Google searches may be noisy. We plan to claim the name via:

- GitHub organization
- npm scope
- `.dev` domain
- Twitter / Mastodon / Bluesky handles
- Product Hunt launch

### Risk 4 — Misinterpretation

Some readers might assume "lab" means unstable or experimental (like Chrome flags). We mitigate by emphasizing "stable once shipped" in the tagline and README.

---

## Final validation checklist

Before we commit to the name in code:

- [ ] Verify `@variantlab` is free on npm
- [ ] Register `variantlab.dev`
- [ ] Create GitHub organization `variantlab`
- [ ] Reserve handles on Twitter, Bluesky, Mastodon, LinkedIn
- [ ] Run a trademark search in US, EU, and India
- [ ] Socialize the name in a GitHub discussion for community feedback
- [ ] Verify no existing OSS project uses the name actively

If any of these fail, we fall back to the shortlist in order: `polyvariant` → `variox` → a new brainstorm.

---

## Fallback: invent a word

If all pre-existing candidates fail, we invent one. Requirements for an invented name:

- 5-8 characters
- Pronounceable in English, Spanish, and Hindi
- No existing meaning in any major language (verified via Wiktionary)
- Clean trademark search
- `.dev` domain available
- Short npm scope available

Candidates if we go this route: `varex`, `expio`, `experi`, `splitly`, `sprou`.

---

## Decision

**Go with `variantlab` pending the validation checklist.** If blocked, revisit this document.
