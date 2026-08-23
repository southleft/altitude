# Figma ↔ Altitude Token Sync (Agent-Mediated)

> **Multi-project note (2026-08-22).** This document describes the sync loop for
> the **Altitude** design system and its file. The repo now drives more than one
> design system off the same component library — see
> [`DS-PROJECTS.md`](./DS-PROJECTS.md) and `.altitude/ds-projects.json`. The
> method below transfers unchanged; only the target file, manifest and ops dir
> differ, and all three come from the project record rather than from constants.
> Southleft's file (`Southleft V5`, `rdhBS9t89V42E7EfiPjmSa`) started EMPTY, so
> for that project every component reads `missing-in-figma` and the generated
> prompts are build-it instructions, not reconcile instructions.

> How Altitude's token source (`libs/al-web-components/styles/tokens/`) stays in
> agreement with the Figma variables library, using the
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

Altitude's source of truth is the Tokens Studio-format tree in
`styles/tokens/` (`value`/`type` keys; `$metadata.json` declares
`tokenSetOrder`; `scripts/convert-tokens-to-dtcg.js` derives the DTCG mirror
that Style Dictionary v5 builds). Figma organizes the same decisions as
**collections** (an axis) containing **modes** (the axis's variants):

| Figma collection | Modes | Altitude source |
|---|---|---|
| Primitive | Default | `tokens/tier-1/*.json` |
| Semantic | Default | `tokens/tier-2/*.json` (borders, spacing, shadows, typography, …) |
| Color Scheme | Light, Dark | `tokens/tier-2/theme/{light,dark}/` |
| Brand | Altitude, Southleft | `tokens/tier-2/brand/<brand>/` (sparse overrides) |
| Composed (tier 3) | Light, Dark | `tokens/tier-3/theme/{light,dark}/` |
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
4. **`$metadata.json` tokenSetOrder is code-only** but must stay consistent
   with any set you add during reconciliation.

## A brand is a recipe, not an axis

For agents especially: a brand's *look* is **brand tokens + mode + density +
shape + motion together** (plus assets like the logo). "Render as Southleft"
is never a single attribute flip — southleft is single-mode by design (dark
only), enforced by the `PresetBundle` union in `.storybook/presets.ts`. When
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
   - *Design change (Figma → code):* edit `styles/tokens/**` to match the
     export (respecting fidelity rules), then
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

**Opacity is a FRACTION on the Figma side — `opacity/40` = `0.4`.**

> **Corrected 2026-08-22.** This paragraph previously said the opposite ("`opacity/40` = `40`,
> not `0.4` … do not 'fix' it in either direction"). That was an observation of the file
> BEFORE `scripts/figma-var-fixes.mjs` ran; that script then deliberately rewrote the four
> opacity variables to fractions (`:39-43`, rationale: "Figma opacity fields are 0-1 … `40`
> bound to a layer opacity is meaningless"). Verified against the live library snapshot
> `.altitude/figma-sync/figma-live-vars.json`: `opacity/40` → `0.4000000059604645` (float32
> of 0.4). Fractions are correct and match the code; the old wording would have had the next
> agent "fix" a correct value back to broken.

Both sides now store fractions, so opacity is a straight value comparison, not a unit
convention. `Southleft V5` was seeded the same way
(`scripts/figma-southleft/push-variables.mjs`, which keeps an `--opacity-percent` escape
hatch should this ever be revisited).

**Southleft is no longer dark-only.** `.storybook/presets.ts:34-35` types the pairs as
`altitude|southleft` x `light|dark`, and `styles/tokens-config.v5.mjs:486-489` builds
exactly those four — 2 brands x 2 modes. The Figma file may still carry `Northright` and
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
