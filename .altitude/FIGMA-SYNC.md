# Figma ↔ Altitude Token Sync (Agent-Mediated)

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
   `pnpm --filter al-web-components build:tokens`.

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
2. **Diff** — run `node scripts/check-figma-drift.mjs .altitude/figma-sync/last-export.json`
   for the deterministic name/value comparison; read its report.
3. **Reconcile** — direction depends on which side moved:
   - *Design change (Figma → code):* edit `styles/tokens/**` to match the
     export (respecting fidelity rules), then
     `pnpm --filter al-web-components build:tokens` and the token contract
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

Automation. The queued verification work is a **stable per-token identity and
a differ that proves the two sides still agree** after either moves — that is
`scripts/check-figma-drift.mjs`'s job to grow into. More automation
(scheduled sync, write pipelines) is explicitly not the goal.
