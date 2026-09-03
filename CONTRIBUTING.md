# Contributing to Altitude

Altitude is a design system maintained by [Southleft](https://southleft.com).
This document explains how to propose a change.

The v2 refactor that this file used to organise itself around **completed on
2026-06-16**. Its plan is preserved, unedited, at
[`.altitude/history/NEXT-GEN-UPGRADE-PLAN.md`](./.altitude/history/NEXT-GEN-UPGRADE-PLAN.md)
— read it for the *why* behind the architecture, never as a live instruction.
There are no phases and no plan task IDs to map work to any more.

## Before you start

1. **Find the process.** [`.altitude/WORKFLOWS.md`](./.altitude/WORKFLOWS.md) routes
   every kind of change to its commands, gates and docs. Specs and open work live
   in `.mm/` (`.mm/specs/`, `.mm/tasks/tasks.md`, `.mm/issues/issues.md`).
2. **Check `.altitude/migration.json`.** If the component you want to touch is
   in state `legacy`, only migration-typed changes are allowed (see [G2](#guardrails)).
3. **Honor the guardrails.** Anything that crosses G1, G2, G7, or G8 must call
   that out in the PR — don't bury it. The full set is in
   [`AGENTS.md` § "The standing rules (G1–G8)"](./AGENTS.md).

## Setup

```bash
nvm use                                  # Node 22 LTS (pinned in .nvmrc)
pnpm install                             # pnpm 9 workspaces
pnpm run build                           # build the libraries
pnpm --filter al-app-docs start          # docs site on :6120/docs — the documentation surface
```

Two other surfaces are worth knowing:

```bash
pnpm --filter @southleft/al-web-components start          # Altitude MCP (streamable HTTP) on :6017
pnpm --filter @southleft/al-web-components start:fixture  # story fixture — every story rendered with real Lit
```

**Storybook was retired 2026-08-25** and has no successor component explorer.
`apps/docs` documents the components; the story fixture
(`libs/al-web-components/story-fixture`, built by `pnpm run build:story-fixture`)
is what the accessibility sweep renders against.

## Find the process

Don't hunt — [`.altitude/WORKFLOWS.md`](./.altitude/WORKFLOWS.md) is the process map: for
each kind of change (component, token, brand, Figma sync, docs, release) it lists the
commands in order, the gates that will catch you, and the doc with depth. Highlights:

- **Adding/changing a component:** the `altitude-component-authoring` skill
  (`.claude/skills/`) walks the full checklist; `node scripts/component-check.mjs <tag>`
  verifies it.
- **Figma ↔ code:** `.altitude/PARITY.md` + the `altitude-figma-sync` skill.
- **The brand layer** (`libs/sl-web-components`): `.altitude/BRAND-LAYER.md`.
- **Agents:** the Altitude MCP (`libs/altitude-mcp`, 8 tools) exposes components, tokens,
  validation, and parity over `.mcp.json`.

## Branch model

- `main` — production, and the branch everything is cut from.
- **Topic branches off `main`**, named `<type>/<topic>`, merged back by PR.
  What is on the remote today: `chore/figma-sync-v2`, `feature/v2`,
  `feature/v2-brooke`, plus older `feature/*` topic branches. `feature/v2` is
  where the completed refactor landed; it is history, not a base to branch from.

## Commit style

**Conventional commits**, which is what the log actually contains — the last 20
commits are all `<type>(<scope>): <imperative summary>`:

```
fix(ci,deps): clear the Dependabot failures and the gates main never reached
refactor(tokens): fold the base/space/icon/layout primitives into the theme layer
feat(contracts): bind canvas tokens from the contract instead of guessing them
chore(figma-sync): date-stamp the variable snapshot and guard its reader
```

- Types in use: `feat`, `fix`, `refactor`, `chore`. Scopes are comma-separated
  and name the subsystem (`tokens`, `contracts`, `ci`, `docs`, `release`).
- Body: 1–3 sentences explaining the *why*.
- Co-author lines are welcome.

The `T<phase>.<task>:` subject style this file used to mandate belonged to the v2
refactor and is no longer used.

## Pull requests

Use the template at `pull_request_template.md`. Key fields:

- **What this is** — a `.mm/` spec slug, an issue id, or a plain description.
- **Migration impact** — does this change any `migration.json` state?
- **Acceptance** — how you know it works: the gates you ran, or the spec
  requirement ids you satisfied.

## Changesets (release notes)

Every PR with a public-API or token change must include a changeset:

```bash
pnpm dlx changeset
```

Pick `patch`/`minor`/`major` per the [semver policy](./.altitude/SEMVER.md).
Changesets are aggregated into `CHANGELOG.md` at release time.

## Guardrails

Eight standing rules, G1–G8, stated in full in
[`AGENTS.md` § "The standing rules (G1–G8)"](./AGENTS.md). **Four of them have a CI
job that can fail** — G2, G5, G6 and G8:

- **G2 — migration manifest.** Non-migration changes to `legacy` components fail CI.
  *(jobs: `migration-gate`, `schema-validate-migration`, `gate-self-test`)*
- **G5 — green gate before merge.** The whole `v2-checks` workflow is this gate:
  typecheck, lint, unit tests, VRT, story-fixture a11y, the docs gates, `build:all`.
- **G6 — generated contracts.** Hand-edits to `custom-elements.json` outside the
  generator pipeline fail CI. *(jobs: `cem-and-contracts`, `jsdoc-dialect`)*
- **G8 — baselines.** A PR that bumps a build/dep without updating
  `.altitude/baselines/` fails CI. *(job: `baselines-required`)*

The other four — G1, G3, G4 and **G7 (decorator semantics)** — are **review
obligations with no script behind them**. G7 in particular: nothing in CI asserts
`experimentalDecorators` / `useDefineForClassFields`, so it is on you and the
reviewer. (An earlier version of this file listed G7 as CI-enforced; it is not.)

## Deployment

**Cloudflare Pages**, and nothing else — this repo does not deploy to Heroku.

- The build command is `pnpm run build:all`, with output directory `dist/`. Its
  step order is load-bearing: see the `//build:all` comment in the root
  `package.json`.
- A PR gets a preview deployment; a merge to `main` publishes to
  <https://altitude.pages.dev>, with the docs at `/docs`.
- Files that must live at the published root (`_headers`, `_redirects`,
  `favicon.ico`) are in `pages-root/` and copied by `pnpm run copy:pages-root` —
  read [`pages-root/README.md`](./pages-root/README.md) before adding one.
- `apps/home` was dropped from the deploy on 2026-08-27; `/` now 302s to `/docs/`.

## Questions

Open a discussion in the repo or reach the team at hello@southleft.com.
