# Changesets

This folder is the inbox for release notes during the v2 refactor.

## Why it exists

The v2 refactor will produce many incremental PRs across `al-web-components`
and `al-react`. Each PR that affects the public API (component tags, props,
slots, events, CSS parts, CSS custom properties, registry modes) drops a
markdown file here describing the change and its semver impact.

At release time (`T6.4` in `NEXT-GEN-UPGRADE-PLAN.md`), the changesets are
aggregated into `CHANGELOG.md` for both packages — they ship as a unit so
they share a version line (see `fixed` in `config.json`).

## How to add one

```bash
yarn changeset       # interactive
# or
yarn changeset --empty   # for PRs with no public-API impact
```

Pick the smallest semver bump that satisfies the policy in `.altitude/SEMVER.md`.

## How it differs from a normal release flow

- `commit: false` — we don't want changesets to commit the version bump itself;
  release PRs are explicit.
- `access: restricted` — publishes go to a private/scoped registry by default
  (revisit at T6.4).
- `ignore:` — consumer apps in `apps/` are versioned ad-hoc and not part of
  the released set.

## Initial changeset

We seed an empty one (`v2-refactor-foundation.md`) so the changesets workflow
in CI has something to run against from day one.
