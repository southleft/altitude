## What this is

<!-- A `.mm/` spec slug, an issue id, or a plain description of the change.
     There is no plan Task ID any more — the v2 refactor completed 2026-06-16
     and its plan is archived at .altitude/history/NEXT-GEN-UPGRADE-PLAN.md. -->

## Summary

What changes were made in this PR, and why?

## Migration impact

<!-- Does this change any `.altitude/migration.json` state? If a `legacy` component is touched, only migration-typed changes are allowed (G2). -->

## Acceptance

<!-- How do you know it works? The gates you ran and their result, or the spec requirement ids this satisfies. -->

## Checklist

- [ ] **Component changes:** `node scripts/component-check.mjs <tag>` passes — bundle.ts, migration.json, CEM regenerated, parity seeded, React wrapper, guidance YAML, llms.txt.
- [ ] **Changeset** added for any public-API or token change (`pnpm dlx changeset`, per `.altitude/SEMVER.md`).
- [ ] **Tokens** edited in `styles/tokens-dtcg/**` (the DTCG source) with a `cssType` extension on any new token; `.altitude/baselines/` updated where G8 applies.
- [ ] **Stories** (`<name>.stories.ts`) updated and accessibility checked — `pnpm run a11y:report:fixture`. Storybook was retired 2026-08-25; the story files feed the story fixture, the docs previews, and the MCP.
- [ ] **Docs gates** pass locally after `pnpm --filter al-app-docs build`: `pnpm run gate:docs && pnpm run gate:docs-panels && pnpm run gate:guidance && pnpm run check:llms`.

<!-- Process map: .altitude/WORKFLOWS.md routes every kind of change to its commands, gates, and docs.
     Standing rules G1-G8: AGENTS.md § "The standing rules (G1-G8)". -->
