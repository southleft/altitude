# Contributing to Altitude

Altitude is a design system maintained by [Southleft](https://southleft.com).
This document explains how to propose changes during the **v2 refactor**.
The authoritative plan lives in [`NEXT-GEN-UPGRADE-PLAN.md`](./NEXT-GEN-UPGRADE-PLAN.md).

## Before you start

1. **Read the plan.** Every change should map to a task ID (`T2.2`, `T4.6`, …)
   or be explicitly flagged as out-of-plan in the PR description.
2. **Check `.altitude/migration.json`.** If the component you want to touch is
   in state `legacy`, only migration-typed changes are allowed (see [G2](#guardrails)).
3. **Honor the guardrails.** Anything that crosses G1, G2, G7, or G8 must call
   that out in the PR — don't bury it.

## Setup (current legacy stack — changes in T2.3)

```bash
nvm use            # node 20.19.4
yarn install       # yarn 1.22.21
yarn build         # libraries
yarn workspace al-web-components start   # Storybook on :6006
yarn workspace al-react start            # Storybook on :9009
```

After T2.3 lands, this will switch to pnpm and Node LTS (22/24).

## Branch model

- `main` — production. Auto-deploys to Cloudflare Pages and Heroku.
- `feature/v2` — the v2 refactor branch. **All v2 work lands here.**
- `feature/<topic>` — focused branches off `feature/v2` for individual phase tasks.

## Commit style

- Subject line: `T<phase>.<task>: <imperative summary>` (e.g.
  `T0.2: seed migration.json with all components as legacy`).
- Body: 1–3 sentences explaining the *why*.
- Co-author lines are welcome.

## Pull requests

Use the template at `pull_request_template.md`. Key fields:

- **Task ID** — the plan task this completes (or "out-of-plan, reason: …").
- **Migration impact** — does this change any `migration.json` state?
- **Acceptance** — paste the relevant Acceptance line from the plan and confirm
  each criterion.
- **Phase gate impact** — does this contribute to or block a gate?

## Changesets (release notes)

Every PR with a public-API or token change must include a changeset:

```bash
yarn changeset
```

Pick `patch`/`minor`/`major` per the [semver policy](./.altitude/SEMVER.md).
Changesets are aggregated into `CHANGELOG.md` at release time (T6.4).

## Guardrails

The plan defines G1–G8. The CI-enforced ones in P0 are:

- **G2 — migration manifest.** Non-migration changes to `legacy` components fail CI.
- **G6 — generated contracts.** Hand-edits to `custom-elements.json` outside the
  generator pipeline fail CI.
- **G7 — decorator semantics.** Removing `experimentalDecorators` or flipping
  `useDefineForClassFields` is rejected by CI.
- **G8 — baselines.** A PR that bumps a build/dep without updating
  `.altitude/baselines/` fails CI.

See `NEXT-GEN-UPGRADE-PLAN.md` §1 for the full guardrail set.

## Questions

Open a discussion in the repo or reach the team at hello@southleft.com.
