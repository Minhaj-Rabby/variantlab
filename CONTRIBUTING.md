# Contributing to variantlab

Thank you for considering a contribution. variantlab is currently in Phase 0 (Foundation) — we are actively seeking contributors who want to shape the API before a single line of code is written.

## Table of contents

- [Current phase](#current-phase)
- [Ways to contribute](#ways-to-contribute)
- [Code of conduct](#code-of-conduct)
- [Before you start coding](#before-you-start-coding)
- [Development setup](#development-setup)
- [Pull request process](#pull-request-process)
- [Commit conventions](#commit-conventions)
- [Changesets](#changesets)
- [Documentation changes](#documentation-changes)
- [Security disclosures](#security-disclosures)

---

## Current phase

**We are in Phase 0: Foundation.** This means:

- **No production code exists yet.** If you open a PR adding a `src/` file, we will close it with a pointer to this document.
- All work is on documentation, design, and API surface.
- The most valuable contributions right now are reviews, critiques, and proposals on the existing docs.

When Phase 1 begins, this document will be updated to describe the coding workflow.

See [`ROADMAP.md`](./ROADMAP.md) for the current phase and [`docs/phases/phase-0-foundation.md`](./docs/phases/phase-0-foundation.md) for detailed Phase 0 work.

---

## Ways to contribute

### 1. Review the API surface

Read [`API.md`](./API.md) and open a GitHub discussion with:

- Parts that feel awkward
- Missing functionality
- Naming concerns
- Type-safety gaps
- Comparisons to how other tools solve the same problem

### 2. Review the threat model

Read [`SECURITY.md`](./SECURITY.md) and open a discussion if you spot:

- Missing threats
- Weak mitigations
- Better alternatives to the proposed designs
- Privacy concerns we missed

### 3. Propose a framework adapter

If your favorite framework is not yet planned, open a discussion with:

- Framework name and version
- How experiments would be consumed (hooks, components, composables, signals)
- SSR considerations
- Sample code using the planned API
- Estimated bundle size

We will evaluate and potentially promote it to a future phase.

### 4. Contribute research

Add new content to `docs/research/`:

- Additional competitor analyses
- Framework-specific SSR quirks we missed
- Novel debug overlay patterns from other tools
- Security research papers relevant to client-side experimentation

### 5. Test the proposed APIs by hand

The best feedback comes from trying to write real application code against the proposed API. Open a discussion with a code sample showing what works and what doesn't.

---

## Code of conduct

We follow a simple principle: **be kind, be specific, be useful**. Disrespectful, condescending, or harassing behavior will not be tolerated. We follow the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

Report violations to `conduct@variantlab.dev`.

---

## Before you start coding

**Phase 0 has no coding.** Once Phase 1 begins:

1. Check the [issue tracker](https://github.com/variantlab/variantlab/issues) for an open issue matching your idea, or create one
2. Wait for a maintainer to label it `accepted` before you start work
3. Comment on the issue to claim it
4. Open a draft PR early so maintainers can guide you

This process prevents wasted effort on changes we can't merge.

---

## Development setup

*(Phase 1+ only — ignored during Phase 0.)*

### Prerequisites

- Node 18.17+ (we test 18, 20, 22)
- pnpm 9+
- Git

### Clone and install

```bash
git clone https://github.com/variantlab/variantlab.git
cd variantlab
pnpm install
```

### Build everything

```bash
pnpm build
```

### Run tests

```bash
pnpm test            # all packages
pnpm test --filter=@variantlab/core  # one package
pnpm test:watch      # watch mode
```

### Check bundle sizes

```bash
pnpm size
```

### Lint + format

```bash
pnpm check           # biome check
pnpm fix             # biome check --apply
```

### Run example app

```bash
pnpm --filter=example-expo-router start
```

---

## Pull request process

1. **Fork** the repo and create a feature branch from `main`
2. **Write tests** for your change. Every bug fix needs a regression test. Every feature needs at least one integration test.
3. **Run the full test suite locally** before pushing: `pnpm build && pnpm test && pnpm size && pnpm check`
4. **Add a changeset** if your PR touches public APIs: `pnpm changeset`
5. **Update documentation** — relevant `API.md`, `README.md`, `docs/` files
6. **Open a PR** with:
   - A clear title (matches a commit convention — see below)
   - A description explaining *what* and *why*
   - Links to related issues/discussions
   - Screenshots or GIFs for UI changes
   - A checklist of changed packages
7. **Respond to review feedback** promptly
8. **Rebase on main** (do not merge main into your branch)
9. Once approved, a maintainer will merge via squash

### What we look for in review

- **API consistency** — does this match patterns elsewhere in variantlab?
- **Bundle size impact** — is the change within budget?
- **Type safety** — are the new types as strict as possible?
- **Test quality** — are the tests isolated, deterministic, fast?
- **Documentation** — is the change documented where users would look?
- **Security implications** — does this change any assumption in `SECURITY.md`?
- **SSR correctness** — does this change break any SSR guarantee?

---

## Commit conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

Types:

- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation changes
- `refactor` — code change that neither adds a feature nor fixes a bug
- `perf` — performance improvement
- `test` — adding or updating tests
- `chore` — build, CI, tooling
- `security` — security fix (always shipped in the next patch)

Scopes:

- `core`, `react`, `react-native`, `next`, `remix`, `vue`, `svelte`, `solid`, `astro`, `nuxt`, `cli`, `devtools`, `docs`, `ci`

Examples:

```
feat(react): add useRouteExperiments hook
fix(core): handle missing userId in stickyHash
docs(api): document VariantErrorBoundary props
security(core): prevent prototype pollution in schema validator
```

---

## Changesets

Every PR that changes public APIs must include a changeset. Run:

```bash
pnpm changeset
```

Follow the prompts:

1. Select changed packages (space to toggle, enter to confirm)
2. Select bump type (patch, minor, major)
3. Write a description (will appear in CHANGELOG)

Commit the generated file with your PR.

PRs that only change docs, tests, or internal tooling do not need changesets.

---

## Documentation changes

Documentation lives in two places:

- **Root markdown files** (`README.md`, `API.md`, etc.) — authoritative reference
- **Docs site** (`apps/docs/`) — long-form guides, tutorials, recipes

Changes to the API must first land in `API.md`. Changes to features must update the relevant `docs/features/*.md` spec. Changes to architecture must update `ARCHITECTURE.md`.

We prefer small, focused doc PRs over large reorganizations.

---

## Security disclosures

**Do not open public issues for security vulnerabilities.** See [`SECURITY.md`](./SECURITY.md) for the private reporting process.

---

## Questions?

Open a GitHub discussion or reach out on our community channel (once established). We read every message.

---

Thank you for helping build variantlab. Every contribution — code, docs, reviews, ideas — makes the project better.
