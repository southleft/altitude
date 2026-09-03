# Branch rulesets

`main.json` is the ruleset applied to `main`, checked in so the protection is
reviewable in a diff instead of living only in the GitHub UI.

## Why it exists

Until 2026-09-02 `main` had **no** protection and **no** required checks:
`gh api repos/southleft/altitude/branches/main/protection` returned
`404 Branch not protected`, and `.../rulesets` returned `[]`. In the four days
before that, 18 commits were pushed straight to `main`. The run on `307106f0`
failed five jobs — tokens snapshot, bundle snapshot, a VRT baseline,
`hand-run gates`, and `gate-self-test` — and *also* skipped three more (`G2 -
migration manifest gate`, `G8 - baselines updated on build/dep change`,
`Changesets present on public-API PRs`), because all three are guarded by
`if: github.event_name == 'pull_request'` and a direct push is not one.

The workflow header says "every commit that lands there must keep its own
complete check record". The record existed; nothing consulted it. This ruleset
is the half that was missing: red now blocks.

## What it enforces

| Rule | Effect |
|---|---|
| `pull_request` | No direct pushes to `main`. Zero approvals required — this is a small team, and the point is the gate, not a second pair of eyes. All three merge methods stay allowed. |
| `required_status_checks` | All 27 `v2-checks` jobs must pass. `strict` is **off**, so a PR does not have to be rebased every time `main` moves. |
| `non_fast_forward` | No force pushes. |
| `deletion` | `main` cannot be deleted. |

There are **no bypass actors**, deliberately — including for admins. An
emergency is handled by editing or disabling the ruleset on purpose, which
leaves a trace, rather than by a silent override that does not.

Because direct pushes are now impossible, the three `pull_request`-only jobs
above no longer have a gap to fall through, so they were left as they are.

## The required-check list is generated, not typed

Every context in `main.json` was read off a **real** run
(`gh run view <id> --json jobs --jq '.jobs[].name'`), not transcribed from
`v2-checks.yml`. A required check whose name does not exactly match a job that
actually reports will never go green, and the PR blocks forever — so never
hand-edit a context string here.

Regenerate the list after renaming a job or adding one:

```sh
gh run list --workflow=v2-checks.yml --limit 1 --json databaseId --jq '.[0].databaseId'
gh run view <that id> --json jobs --jq '.jobs[].name'
```

Update `main.json`, then push the change:

```sh
# find the id
gh api repos/southleft/altitude/rulesets --jq '.[] | {id, name}'
# update in place
gh api -X PUT repos/southleft/altitude/rulesets/<id> --input .github/rulesets/main.json
```

**Renaming a CI job is a breaking change to this file.** The job's `name:` in
`v2-checks.yml` is the check context; change one without the other and merges
stop.

## Not required on purpose

`Cloudflare Pages` reports pass-or-fail in 0 seconds because the integration is
not building previews for PRs — it is a coin with no face, so requiring it would
add noise, not safety. `build:all (Cloudflare parity)` is the job that actually
proves the deploy builds, and that one **is** required.
