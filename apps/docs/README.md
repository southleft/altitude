# `al-app-docs` — one docs engine, one site per design system

This workspace builds **a documentation site for every design-system project in
[`.altitude/ds-projects.json`](../../.altitude/ds-projects.json)** — not one site
with a brand switch, and not a fork per client. Today that is two sites:

| Project | Route | Scope | Brand |
| --- | --- | --- | --- |
| the registry's `default` | `/docs/` | the whole component library | its own |
| every other project | `/docs/<id>/` | that project's `library.components` | its own |

## Restart the dev server after adding a route or rebuilding

`pnpm --filter al-app-docs start` (port 6120) holds its route manifest and module
graph in memory. A server left running across a dependency rebuild or a new file
in `src/pages/` goes stale, and it does not say so — it serves plausible, wrong
answers:

- every `*.json` endpoint 500s with
  `NoManifestAvailableError: new FetchState(request) was called outside of an
  Astro server`, including ones that were working before and still build fine;
- pages keep rendering, but against whatever `main.css` was current when the
  process started — a stale bundle here made the whole docs shell render light
  while the theme toggle correctly said dark (2026-09-03).

Both symptoms came from one process that had been up since before a token
rebuild. If something in the docs behaves impossibly, stop and restart it first:

```sh
pnpm --filter al-app-docs exec astro dev stop
pnpm --filter al-app-docs start
```

The build is unaffected — `pnpm --filter al-app-docs build` reads from disk every
time, which is why CI never sees either symptom.

Run `pnpm --filter al-app-docs check:coverage` for the live numbers; they are
never quoted here, for the same reason no component count is typed in the site.

## The rule

**Nothing component-shaped and nothing project-shaped is hand-maintained.**

- Component data comes from `libs/al-web-components/custom-elements.json` plus
  each component's own story title — [`src/lib/registry.mjs`](src/lib/registry.mjs).
- Project data comes from `.altitude/ds-projects.json`, read through the same
  resolver the parity CLIs and the MCP tools use
  (`libs/altitude-mcp/src/lib/ds-project.mjs`) —
  [`src/lib/projects.mjs`](src/lib/projects.mjs).
- The two are combined once, per project, in
  [`src/lib/context.mjs`](src/lib/context.mjs): `{ project, registry, site, href }`.
  Every page, endpoint and gate takes that context and nothing else.

`apps/docs/scripts/check-third-project.mjs` enforces the consequence: **no
design-system id appears anywhere in this app's source.** If one does, at least
one brand has become a special case, and the gate fails naming the file and line.

## Adding a client brand

### 1. A registry entry — required

Add one object under `projects` in `.altitude/ds-projects.json`. The schema
beside it documents every field; the ones this site reads are:

```jsonc
"acme": {
  "id": "acme",                       // also the route: /docs/acme/
  "name": "Acme Design System",       // page titles; "Design System" is trimmed
  "brand": "acme",                    // <al-theme brand="acme"> around every page
  "figma": { "fileKey": "…", "fileName": "Acme UI", "decoys": [] },
  "paths": { "parityManifest": ".altitude/figma-sync/acme/parity-manifest.json", … },
  "library": {
    "workspace": "@southleft/al-web-components",
    "root": "libs/al-web-components",
    "tagPrefix": "al-",
    // OMIT to document the whole library. Present = this system's declared
    // scope, and the only components that get pages on its site.
    "components": ["al-button", "al-card", …]
  },
  "storybook": { … },
  "prompts": { … },
  "excluded": { "al-icon": "why this is deliberately absent from Figma" }
}
```

Then `pnpm run check:ds-projects` (registry validity) and
`pnpm run parity:seed -- --project acme` (its parity manifest).

An `id` that collides with a page this site already owns (`components`,
`foundations`, `llms.txt`, `status.json`, …) is rejected at build time rather
than silently shadowed — see `RESERVED_SEGMENTS` in `src/lib/projects.mjs`.

### 2. A brand token set — optional

`brand` selects a scoped `:host([brand='acme'])` block emitted by
`libs/al-web-components/styles/tokens-config.v5.mjs` from the tier-3 sources.
With no such block the brand renders on the base token bundle, which is exactly
what the reference brand does — a design system can ship a docs site before it
has a palette. What a brand may override is
[`.altitude/BRANDS.md`](../../.altitude/BRANDS.md); the Foundations page of each
site lists the properties that brand actually redeclares, read from the emitted
partial.

The docs chrome follows the brand too, from one rule: `docs.css` re-declares
`--blue` on the `al-theme` element as
`var(--al-theme-color-content-primary-default)`. Declared on the host and not on
`:root`, so it substitutes against the *branded* value.

### 3. A logo — optional

Drop `src/brand-marks/<brand>.svg` (wordmark) and `src/brand-marks/<brand>.mark.svg`
(standalone mark). They are picked up by `import.meta.glob` — an asset, not an
import to add. With no file the sidebar renders the project's name as a
typographic wordmark.

### What you do **not** touch

Routes, sidebar, taxonomy, counts, props tables, playgrounds, parity panels,
accessibility panels, Markdown twins, `llms.txt`, `llms-full.txt`,
`status.json`, or the sitemap. All of them are derived.

## Keeping a scoped system honest

A scoped system claims to be "the part of the library this product ships". That
claim rots the moment someone adds a component to the product and forgets the
registry. `scripts/check-sl-scope.mjs` (repo root) re-derives each scoped
project's allowlist from its consuming app's source and fails on a mismatch; it
runs in CI (`.github/workflows/v2-checks.yml`) and is chained ahead of the docs
coverage gate, so **using a component on the site is what earns it a docs page**.

## Gates

| Command | Proves | Needs a build |
| --- | --- | --- |
| `pnpm run gate:docs` | the scope is honest against the product, every component in the manifest has a page, and every project's scope resolves | no |
| `pnpm run gate:docs-generalises` | a throwaway third project gets a complete, correctly scoped, correctly branded site — and no project id is typed in this app's source | no |
| `pnpm run gate:docs-panels` | the built output leaks no Figma keys or internal paths, every status panel states data or a reason, every rendered status matches the engine, and every page carries its own `<al-theme brand>` | yes |

## Layout

```
src/lib/          projects.mjs · registry.mjs · context.mjs · site.mjs
                  parity.mjs · a11y.mjs · tokens.mjs · markdown.mjs · artifacts.mjs
src/components/   the shell's parts (Sidebar, Playground, panels, Logo, BrandTheme)
src/components/pages/   the four page BODIES, shared by every project's routes
src/pages/        routes only — bind one context to one body
src/pages/[project]/    the same routes again, once per non-default project
src/brand-marks/  <brand>.svg assets
scripts/          the three gates
```
