# Figma ↔ Altitude Token Sync (Agent-Mediated)

> **Multi-project note (2026-08-22).** This document describes the sync loop for
> the **Altitude** design system and its file. The repo now drives more than one
> design system off the same component library — see
> [`DS-PROJECTS.md`](./DS-PROJECTS.md) and `.altitude/ds-projects.json`. The
> method below transfers unchanged; only the target file, manifest and ops dir
> differ, and all three come from the project record rather than from constants.
> Southleft's file (`Southleft V5`, `rdhBS9t89V42E7EfiPjmSa`) started EMPTY in
> 2026-08-23 but has since been populated (24 mapped sets as of 2026-08-27 —
> `pnpm run parity:projects` is the live answer), so its generated prompts are
> ordinary reconcile instructions now, same as Altitude's.

> How Altitude's token source (`libs/al-web-components/styles/tokens-dtcg/`)
> stays in agreement with the Figma variables library, using the
> [Figma Console MCP](https://github.com/southleft/figma-console-mcp) server.
> The loop is **operator-driven and agent-mediated** — a human (or an agent
> acting for one) initiates every sync. Nothing runs on a schedule, and there is
> no REST pipeline. That shape is a decision, not a shortfall: it keeps the
> design-tool edge on the same deterministic-gates thesis as the rest of the
> system (AI authors once; deterministic checks enforce forever) and does not
> block on Figma's enterprise-gated programmatic write access.

## Prerequisites

1. **Figma Console MCP** registered in `.mcp.json` (entry `figma-console`,
   opt-in). NPX mode needs Node 18+, a Figma Personal Access Token with scopes
   *File content*, *File versions*, *Variables*, *Comments*, and the Desktop
   Bridge plugin for write operations. Cloud/SSE modes exist for read-only
   exploration.
2. The Altitude token build passing locally:
   `pnpm --filter @southleft/al-web-components build:tokens`.

## What maps to what

Altitude's source of truth is the hand-authored DTCG tree in
`styles/tokens-dtcg/` (`$value`/`$type`, plus an
`$extensions["org.altitude.token"].cssType` per token carrying the authored CSS
surface — see [`TOKENS.md`](./TOKENS.md)). Style Dictionary v5 builds directly
from it; there is no intermediate tree and no converter. **Code is upstream of
Figma**: `scripts/build-figma-payload.mjs` generates the Figma variable payload
*from* these files, writing `.altitude/figma-sync/altitude-figma-payload.json`
(the token values `scripts/figma-atoms/build-spec.mjs` reads back in when
building a component spec). It is **manually invoked** — no `pnpm run` alias,
no CI step — run it by hand (`node scripts/build-figma-payload.mjs`) whenever
`build-spec.mjs` needs a fresh payload after a token change. Nothing imports
Figma back into them automatically.

Figma organizes the same decisions as **collections** (an axis) containing
**modes** (the axis's variants). The table below names the CONCEPTUAL axes; the
live file's collection names are tier-styled and have been observed with TWO
spellings at different dates — `Tier 2 Theme` / `Tier 2 Brand`
(`scripts/audit-figma-vs-code.mjs:130,135`, 2026-08-20) vs `Tier 2 | Theme`
(`scripts/contracts/figma/conventions.mjs:68`, read live via
`getLocalVariableCollectionsAsync` on 2026-08-26). **Read the collection names
live before matching on them; never trust a doc's spelling.**

| Axis (conceptual) | Modes | Altitude source |
|---|---|---|
| Primitives (tier 1) | Default | `tokens-dtcg/tier-1/*.json` |
| Semantic (tier 2) | Default | `tokens-dtcg/tier-2/*.json` (borders, spacing, shadows, typography, …) |
| Theme | Light, Dark | `tokens-dtcg/tier-2/theme/{light,dark}/` |
| Brand | Altitude, Southleft | `tokens-dtcg/tier-2/brand/<brand>/` (sparse overrides) |
| Composed (tier 3) | Light, Dark | `tokens-dtcg/tier-3/theme/{light,dark}/` |
| Density / Shape / Motion / Contrast | per axis | hand-written `:host([attr])` rules in `components/theme/theme.scss` (see `.altitude/AXES.md` / `REGISTRATION.md` era docs) — **not** token-file axes today; model in Figma only once they become token roles |

Axes are **orthogonal** — a variant combination (Southleft + Dark + Compact)
is a runtime composition, never a duplicated token file, in either tool.

## Fidelity rules (the discipline)

These are rules the operator/agent follows — the drift check verifies names
and values, not judgment:

1. **The token JSON mirrors Figma faithfully.** No value synthesis or unit
   transforms during sync. All conversions (px→rem, % letter-spacing→em,
   0–100 opacity→0–1) happen code-side in Style Dictionary — Figma keeps raw
   design-tool values.
2. **Sparse overrides stay sparse.** A brand file contains only what that
   brand changes (see `tier-2/brand/southleft/` vs `tier-2/brand/altitude/`);
   mirror that as sparse mode values in Figma, inheriting the default mode.
3. **Some concepts are code-only** (e.g. cascade layers, `styleModifier`
   utilities, versioned-tag registry). They have no Figma representation and
   are excluded from sync entirely.
4. **Adding a token set is a directory operation, not a manifest edit.**
   `tokens-config.v5.mjs` globs the tier directories, so a new file under
   `tokens-dtcg/tier-2/brand/<brand>/` is picked up on the next `build:tokens`.
   The only ordering that exists lives in that config's `include`/`source`
   split — there is no `tokenSetOrder` manifest any more.

## A brand is a recipe, not an axis

For agents especially: a brand's *look* is **brand tokens + mode + density +
shape + motion together** (plus assets like the logo). "Render as Southleft"
is never a single attribute flip — both brands build in both modes (the 2×2
`brands` matrix in `styles/tokens-config.v5.mjs:591-603`; southleft's light
"paper" mode was added by spec 2026-08-20-southleft-example-app). When
syncing or generating in Figma, apply the full recipe; when documenting a
brand, state its recipe explicitly.

## The sync loop

1. **Read** — `figma_export_tokens` (DTCG format) / `figma_get_variables`
   against the live file. Save the export to
   `.altitude/figma-sync/last-export.json` (gitignored).
2. **Diff** — run `pnpm run parity:tokens-drift -- .altitude/figma-sync/last-export.json`
   (v1: value comparison with color/dimension/shadow canonicalization,
   brand/mode-aware bucketing, rename detection; `--project <id>` scopes the
   brand data symmetrically; `--json` for machine output; exit 1 on drift).
3. **Reconcile** — direction depends on which side moved:
   - *Design change (Figma → code):* **hand-edit** `styles/tokens-dtcg/**` to
     match the export (respecting fidelity rules) — there is no importer
     script; then
     `pnpm --filter @southleft/al-web-components build:tokens` and the token contract
     tests (`test:tokens`, root `test:brands` / `test:preset-parity`).
   - *Token change (code → Figma):* push variables with
     `figma_batch_create_variables` / import-with-apply, preserving the
     collection/mode layout above.
4. **Verify** — re-export, re-run the drift check, expect zero findings.
   Commit the token JSON changes (never the export file).

## Dry-run playbook (first session)

1. Register the MCP server and open the Altitude Figma library file.
2. `figma_export_tokens` → save export; run the drift check. Expect a large
   one-time report if the Figma file predates this doc — triage it into
   "Figma is right" / "code is right" / "code-only, exclude" buckets before
   changing anything.
3. Reconcile ONE small token group end-to-end (e.g. `tier-1/opacity.json`)
   to validate the loop, tests included, before attempting color.
4. Record decisions (exclusions, naming mismatches kept deliberately) in
   `.altitude/figma-sync/decisions.md` so the next run doesn't re-litigate.

## What is deliberately missing

Automation of the *loop itself*. The differ half of the queued verification
work landed 2026-08-23: `scripts/check-figma-drift.mjs` v1
(`pnpm run parity:tokens-drift`) compares values, not just names —
canonicalized per type, bucketed per brand/mode, with rename detection. Its
parser was validated against a real `figma_export_tokens` capture on
2026-08-23 (see the script header for the confirmed shape and the
first-contact findings, tracked as an `.mm` issue). More automation
(scheduled sync, write pipelines) is explicitly not the goal.

---

## 2026-08-20 — verified corrections to this document

Learned by actually doing the sync against the live file. Where this section disagrees
with the text above, **this section is right**.

**The canonical file is `Altitude Design System` — `y83n4o9LOGs74oAoguFcGS`.**
`Altitude DS` (`NGpu9IJj2pRhNru1QTGmuF`) is an empty scratch file; an earlier pass built
31 component sets into it by mistake. Confirm the file key before any write.

**Rule 3 is wrong about icons.** `icon/*` and `theme/icon/*` DO exist as Figma variables
and are legitimately synced. Only `z-index` and `breakpoint` are genuinely code-only,
alongside `animation.duration.*` / `animation.timing.*` (no Figma variable type) and
`border.radius.round` (a `%` Figma's unitless FLOAT cannot hold).

**Opacity is a PERCENTAGE on the Figma side — `opacity/40` = `40`, and the code's `0.4`
is the SAME value. The two sides differ by a factor of 100 by design.**

> **Re-corrected 2026-08-27, this time by measuring what a binding RENDERS rather than
> what it stores.** The 2026-08-22 correction below was wrong, and the wording it replaced
> was right.
>
> Proven live against `al-field-note` `State=Disabled` — a TEXT node whose `opacity` is
> bound to `theme/opacity/disabled` → `opacity/40`:
>
> | `opacity/40` stored as | resulting `node.opacity` | |
> |---|---|---|
> | `0.4` | `0.004` | 0.4% — effectively invisible |
> | `40`  | `0.4`   | 40% — correct |
>
> Figma's `opacity` FIELD is 0–1, but a variable BOUND to it is resolved in the unit the
> UI displays (percent) and divided by 100. The 2026-08-22 correction reasoned from the
> field's 0–1 range and then "verified" only that the STORED number equalled the code
> token (`0.4 === 0.4`) — a value comparison that cannot see the 100x the binding applies.
> That is the trap: for opacity, agreement in the audit means breakage on the canvas.
>
> The four `setValue('opacity/*', …)` calls in `scripts/figma-var-fixes.mjs` that enforced
> fractions have been removed (2026-08-27); re-adding them re-breaks every disabled state
> in the library. `opacity/80` (code `0.8`) was missing from Figma entirely and was created
> as `80` in the same pass.

So opacity is a UNIT CONVENTION, not a straight value comparison: an audit must multiply
the code fraction by 100 before comparing, and report drift only on the converted values.
`Southleft V5` was seeded via `scripts/figma-southleft/push-variables.mjs`, whose
`--opacity-percent` escape hatch is the correct mode for that file too.

**Southleft is no longer dark-only.** The `brands` matrix in
`styles/tokens-config.v5.mjs:591-603` builds exactly four bundles — 2 brands x 2 modes.
(An earlier wording here also cited `.storybook/presets.ts`; that file went with the
Storybook retirement — the token config is the one live source of the pairing.) The Figma file may still carry `Northright` and
`Odyssey` brand modes; the CODE has neither, and neither does any other brand beyond these
two (spec `2026-08-20-brand-pruning-and-storybook-de-bloat` removed six — see
[`BRANDS.md` §7](./BRANDS.md)). Delete stray Figma modes rather than re-adding code for them.

**Token identity must be READ, not inferred.** Matching a computed colour back to the
token table is guesswork — many tokens share a hex, and it cannot recover spacing or
radius at all (`16` is `theme/space/@`, `space/16`, `font-size/16` and `line-height/16`).
The component CSS names its token in the declaration; read that.

### Where the tooling lives

| | |
|---|---|
| Full method + traps | `.claude/skills/altitude-figma-sync/SKILL.md` (**tracked** — survives a fresh clone) |
| Scripts | `scripts/audit-figma-vs-code.mjs`, `scripts/figma-var-fixes.mjs`, `scripts/figma-atoms/`, `scripts/figma-southleft/` |
| History and rationale | `.mm/specs/2026-08-20-altitude-figma-atoms/spec.md` (local-only — `.mm/` is not in git) |

An earlier version of this section said `.claude/` was gitignored and the skill would not
survive a clone. That is wrong, and the `.gitignore` comment above its `.claude/` rules says the opposite in as many words:
`.claude/` is **tracked** so skills, agents, commands and `CLAUDE.md` survive a clone —
only `/.claude/worktrees/`, `/.claude/settings.local.json` and `/.claude/.mm-manifest.json`
are ignored. Confirm with `git ls-files .claude/skills/altitude-figma-sync/`.

What genuinely does not survive a clone is `.mm/` (gitignored by design; shared through the
Monday Morning cloud workspace instead), so the spec link above is the one that can go
missing — not the skill.
