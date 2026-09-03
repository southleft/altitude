# Gates

`.altitude/gates.json` is the inventory of every runnable verification in this
repo. `scripts/run-gates.mjs` is the only thing that reads it.

The closest thing to an umbrella before this was a hand-typed command block in
`AGENTS.md`, and it had already gone stale. The manifest is the source of
truth; do not restate its contents here or anywhere else.

## Running

```
node scripts/run-gates.mjs                      # --tier fast
node scripts/run-gates.mjs --tier build
node scripts/run-gates.mjs --group contracts
node scripts/run-gates.mjs --only lint,check:llms --bail
node scripts/run-gates.mjs --list --json
node scripts/run-gates.mjs --check-ci
```

Tiers are cumulative: `build` runs `fast` too, `live` runs all three. Exit 1
means a **blocking** gate failed; a warning-tier failure is printed loudly and
leaves the exit code alone. Exit 2 is a usage error, exit 3 an invalid manifest.

## The `needs` vocabulary

`needs` is a **closed** list, defined in the manifest's `needsVocabulary`, and
the runner has one probe per token. If a prerequisite is unmet the gate is
**skipped by name, with the reason and the command that would satisfy it** — and
counted separately from passed. That separation is the point: a gate that did
not run must never look like a gate that passed.

A new token needs both a vocabulary entry and a probe in `makeProbes()`. An
unknown token fails validation rather than silently skipping.

## Adding a gate

1. Add the entry to `gates.json`. Required: `id`, `command`, `purpose`,
   `needs`, `blocking`, `ci`, `tier`. `purposeSource` records where the prose
   came from — quote the `//`-prefixed sibling key in the root `package.json`
   if the script has one, otherwise the CI step name or the script's header.
   Never invent a purpose.
2. Set `autorun: false` if it mutates a committed artifact or is a full build.
3. Run `node scripts/run-gates.mjs --check-ci`.
4. Run `node scripts/__tests__/run-gates.test.mjs`.

## `ci` is a fact, not a preference

`ci` names the exact `name:` of the job(s) in
`.github/workflows/v2-checks.yml` that run the gate — `null` when nothing there
does. **Renaming a CI job means updating `gates.json` in the same commit.**

`--check-ci` cross-checks both directions and exits non-zero on either: a gate
claiming a job that does not exist or does not invoke it, and a `pnpm run` in
the workflow with no matching entry. Same discipline as `check:llms`,
`check:mcp-docs` and `check:skills` — the derivable half is re-derived and
diffed, not trusted.
