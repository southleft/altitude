# Design-system projects (multi-project parity)

This repo drives **more than one design system off one component library**.
Altitude and Southleft share every `al-*` component in `libs/al-web-components`;
what differs is the brand recipe, the docs-site identity, and — the reason this
document exists — **which Figma file each is checked against**.

## The registry

**`.altitude/ds-projects.json`** (tracked, schema at `ds-projects.schema.json`)
is the single place that answers "what's what". One entry per design system:

| Field | What it decides |
| --- | --- |
| `id` / `name` / `brand` | identity; `brand` is the `<al-theme brand>` value it renders under |
| `figma.fileKey` / `fileName` | the Figma library file — asserted before any write |
| `figma.urlBase` | deep links in the report and the docs-page banner |
| `figma.componentPagePrefix` | which Figma pages the digest snapshot reads (`🛠 `) |
| `figma.decoys[]` | look-alike files `parity:refresh` refuses to run against |
| `paths.figmaSyncDir` | that project's `figma-sync/` artifact zone (canvas dumps, generated ops, scratch — gitignored) |
| `paths.parityManifest` | that project's sync state (tracked) |
| `paths.opsDir` | code-derived Figma build ops |
| `paths.instanceMap` | pinned tag → Figma node ids, **or `null`** |
| `library.*` | workspace, root, tag prefix, `excludeTitlePrefixes` (e.g. `Foundations/`) — the SHARED library, and optionally the subset of it this system ships |
| `brandLibrary.*` | optional SECOND library belonging to this system alone, built on `library`; `supersedes` names the base components it stands in for |
| `docs.*` | docs-site identity: `route` (`""` for the default project, `/southleft` otherwise), `productionBase`, and for southleft a `components` docs-scope (deliberately NOT `library.components` — ships vs. shows; see the registry's own comment). Replaced the removed `storybook.*` block when both Storybooks were retired (2026-08-23/25). |
| `prompts.*` | skill, script dirs and docs spliced into the copy-paste AI prompt |
| `excluded` | tag → why it is deliberately absent from Figma |

Everything that used to be a hardcoded `'Altitude'` string in the parity tooling
now comes from here.

### Why `instanceMap` may be `null`

**Figma node ids are file-scoped.** A node id from the Altitude file means
nothing in the Southleft file — applying one map to another project would mint
confident, wrong mappings. A project with no map of its own seeds every
component as unmapped (`missing-in-figma`), which is the honest state.

## Selecting the active project

First hit wins:

1. an explicit id in code — `resolveProject('southleft')`
2. `--project <id>` on any parity CLI
3. the `DS_PROJECT` env var — for tooling that cannot pass a flag (build hooks, CI jobs)
4. the registry's `default` (`altitude`)

## Commands

The parity CLI table lives in **[`PARITY.md` § Commands](./PARITY.md)** — the
canonical copy. The short version: `parity:projects` answers "what's what";
`parity:seed` / `parity:synced` / `parity:refresh` (+ `:sl` variants) manage a
project's manifest; every underlying script takes `--project <id>` (or
`--project=<id>`) directly.

## MCP surface

- `altitude_list_ds_projects` — discover the ids and what each points at.
- `altitude_check_parity` — now takes an optional `project`; each entry's
  `aiPrompt` names **that project's** Figma file, skill and commands.
- `GET /parity.json?project=<id>` on the MCP HTTP port; unknown ids return
  `400 ERR_UNKNOWN_DS_PROJECT` listing the known ones.
- `GET /ds-projects.json` — the id list plus the default.

## Adding a project

1. Add an entry to `.altitude/ds-projects.json` (the schema documents every field).
2. Give it a manifest path in **its own subdirectory** under `.altitude/figma-sync/`.
   `.gitignore` already re-admits `*/parity-manifest.json` at that depth, so the
   manifest is tracked while the rest of the sync scratch stays ignored.
3. `pnpm run parity:seed -- --project <id>`.
4. Set `paths.instanceMap` only once that project's Figma file actually has
   pinned component sets.

## Status vocabulary

Unchanged and shared across projects — see [`PARITY.md`](./PARITY.md). The
statuses are computed per project against that project's manifest, so the same
component can legitimately be `in-sync` for Altitude and `missing-in-figma` for
Southleft.

## Current state (measured 2026-08-27)

Every number below is computed, not remembered. Note that the **`in-sync` vs.
`code-drift` split is not stable** — code drift is hashed live from component
source, so any un-resynced component edit moves one into the other. Only their
SUM (how many sets are mapped at all) is a durable figure; do not quote the
split here. Re-derive the parity rows with:

```bash
node -e "import('./libs/altitude-mcp/src/lib/parity.mjs').then(async m => {
  for (const p of ['altitude', 'southleft']) {
    const r = m.computeParity(p);
    console.log(p, JSON.stringify(r.summary), 'scope:', JSON.stringify(r.scope));
  }
})"
```

| | Altitude | Southleft |
| --- | --- | --- |
| Figma file | Altitude Design System | Southleft V5 |
| Scope | all 105 components | 27 in scope — the allowlist in `ds-projects.json` (84 omitted), plus the brand layer |
| Brand layer | none | `@southleft/sl-web-components` — `al-hero`, `al-cta-band`, `al-marquee`, `al-logo-wall`, `al-page-hero`, `al-section-header`, plus `al-card` / `al-header` / `al-footer` superseding the base three via define-order (`al-card` folds the former `al-media-card` in as its `article` / `work` variants) (classes remain `SL*`; see `.altitude/BRAND-LAYER.md`) |
| Component sets mapped in Figma | 36 | **24** (the file was empty at the 2026-08-23 measurement and has since been populated) |
| Parity | mapped 36 split across `in-sync`/`code-drift`/`figma-drift`/`conflict`, `missing-in-figma=66`, `missing-in-code=4`, `excluded=3` | mapped 24 split across `code-drift`/`conflict`, `missing-in-figma=1`, `excluded=2` |
| Documentation site | `/docs` (altitude scope) | `/docs/southleft` (Storybook retired for both projects 2026-08-25; see `apps/docs`) |
| Brand deltas | none by design (neutral reference) | 46 of 392 properties |

> **Historical note (superseded 2026-08-27):** this section previously said
> Southleft's file "starts empty" with every component `missing-in-figma` and
> build-it-from-scratch `aiPrompt`s. That was true when measured on 2026-08-23
> and is not any more — 24 sets are mapped, so Southleft prompts are now
> ordinary reconcile instructions. Do not quote per-status splits from this
> table at all; they move with every un-resynced edit. `pnpm run
> parity:projects` is always the live answer.

The "brand deltas" row counts distinct `--al-*` properties **declared** by the
three scoped host partials, against the 392 in the base `:root` bundle:

```bash
cat libs/al-web-components/styles/dist-v5/scss/host/tokens-brand-southleft*.scss \
  | grep -oE '^\s+--al-[a-z0-9-]+:' | sort -u | wc -l   # 46
grep -cE '^\s*--al-' libs/al-web-components/dist/css/main.css              # 392
```
