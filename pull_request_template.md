## Task ID

<!-- The plan task (e.g. T4.6) or spec slug this completes, or "out-of-plan, reason: …" -->

## Summary

What changes were made in this PR, and why?

## Migration impact

<!-- Does this change any `.altitude/migration.json` state? If a `legacy` component is touched, only migration-typed changes are allowed (G2). -->

## Acceptance

<!-- Paste the relevant Acceptance line from the plan (or the spec requirement ids) and confirm each criterion. -->

## Phase gate impact

<!-- Does this contribute to or block a gate? -->

## Checklist

- [ ] **Component changes:** `node scripts/component-check.mjs <tag>` passes — bundle.ts, migration.json, CEM regenerated, parity seeded, React wrapper, guidance YAML, llms.txt.
- [ ] **Changeset** added for any public-API or token change (`pnpm dlx changeset`, per `.altitude/SEMVER.md`).
- [ ] **Tokens** edited only in `styles/tokens/**` (never `tokens-dtcg/`); `.altitude/baselines/` updated where G8 applies.
- [ ] **Stories** updated (WC and React) and accessibility checked.
- [ ] **Docs gates** pass locally after `pnpm --filter al-app-docs build`: `pnpm run gate:docs && pnpm run gate:docs-panels && pnpm run gate:guidance && pnpm run check:llms`.

<!-- Process map: .altitude/WORKFLOWS.md routes every kind of change to its commands, gates, and docs. -->
