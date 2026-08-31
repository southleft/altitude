# Altitude

Design system created by Southleft.com. Documentation is generated from the code and published at [altitude.pages.dev/docs](https://altitude.pages.dev/docs) — the source is `apps/docs`.

## Stack

- **pnpm 9** workspaces, **Node 22 LTS**
- **Vite 5** library and Storybook builds
- **Lit 3.3** web components, **React 19** wrappers via `@lit/react`
- **Style Dictionary v5** token pipeline (DTCG source)
- **Astro 7** documentation site (`apps/docs`)
- **Storybook 10** with the Vite framework, for component development
- **Sass 1.101** using the modern `@use` / `@forward` module system

## Local setup

```bash
nvm use                              # Node 22 LTS (pinned in .nvmrc)
pnpm install
pnpm run build                       # build the libraries — the docs site resolves them through dist/
pnpm --filter al-app-docs start      # docs site on http://localhost:6120/docs
```

`pnpm run build` is not optional before the docs site: `apps/docs` imports
`@southleft/al-web-components` and `@southleft/sl-web-components` through their exports
maps, so it renders against `dist/`, not source. Rebuild a library after changing it.

```bash
pnpm --filter al-app-docs build      # static build to dist/docs
pnpm --filter al-app-docs preview    # preview that build on :6121
```

See `CONTRIBUTING.md` for the full development workflow, and `.altitude/WORKFLOWS.md`
for the process map — which commands, gates, and docs apply to each kind of change.

## Working on the docs site

`apps/docs` builds **one site per design-system project** in `.altitude/ds-projects.json`
(the default project at `/docs/`, every other project at `/docs/<id>/`). Nothing
component-shaped or project-shaped is hand-maintained — sidebar taxonomy, counts, props
tables, playgrounds, parity and accessibility panels, `llms.txt` and the sitemap are all
derived from `custom-elements.json` and the project registry. Adding a client brand is a
registry entry, not code.

Authored prose lives in `apps/docs/src/content/guidance` — that is the half you write by
hand. `apps/docs/README.md` documents the engine, the rules, and what you must not touch.

Gates:

```bash
pnpm run gate:docs                # scope is honest, every component has a page  (no build needed)
pnpm run gate:docs-generalises    # a new brand costs a registry entry, not code (no build needed)
pnpm --filter al-app-docs build && pnpm run gate:docs-panels   # built output: no leaked Figma keys, statuses match the engine
pnpm --filter al-app-docs build && pnpm run gate:guidance      # the authored guidance half
```

## The Southleft example app

`apps/southleft` is the reference consumer: southleft.com v5 rebuilt **exclusively**
from Altitude components plus the Southleft brand layer (`@southleft/sl-web-components`),
with the real insights + work content migrated in. It is the app the brand layer exists
for, and the place a change to either library gets proved against a real site.

```bash
pnpm install
pnpm run build                             # required — see below
pnpm --filter al-app-southleft start       # http://localhost:4188/southleft
```

`pnpm run build` is not optional here either. `apps/southleft` imports
`@southleft/al-web-components` and `@southleft/sl-web-components` through their exports
maps (`src/layouts/Base.astro`), so it renders against `dist/`, not source — rebuild the
library after changing it.

```bash
pnpm --filter al-app-southleft build       # static build to dist/southleft (or pnpm run build:app-southleft)
pnpm --filter al-app-southleft preview     # preview that build on :4188
```

**Images.** The migrated content points at `https://southleft.pages.dev/media`, which sits
behind Cloudflare Access — those images will not load in a plain browser. If a local
checkout of southleft-v5 exists at `../southleft-v5/public/media` (sibling of this repo),
or `MEDIA_LOCAL_DIR` points at another directory that exists, `astro dev` serves it at
`/media` and rewrites the remote URLs client-side. Dev only; the production build is
unaffected (`src/lib/media.mjs`, `src/lib/vite-plugin-local-media.mjs`).

**The gate.** Page styling in this app may only use `.al-u-*` utilities, semantic
`--al-theme-*` tokens, and the minimal layout CSS in `src/styles/layout.css` — no hardcoded
colors, px font sizes, or untokenized shadows:

```bash
pnpm --filter al-app-southleft check:altitude-only
```

Southleft is also a **design-system project** in its own right (`.altitude/ds-projects.json`):
its docs are at `/docs/southleft`, and the parity CLIs take `--project southleft` or the
`:sl` script variants. See `.altitude/DS-PROJECTS.md` and `.altitude/BRAND-LAYER.md`.

## Storybook

The two component Storybooks are still the **component development** surface — they are
not the documentation site, and the published docs no longer come from them.

```bash
pnpm --filter @southleft/al-web-components start   # Storybook on :6006 + Altitude MCP on :6017
pnpm --filter @southleft/al-react start            # Storybook on :9009
```

(The Southleft brand-layer Storybook was retired on 2026-08-23; `/docs/southleft`
documents that package now.)

## Tooling worth knowing on day one

- **Altitude MCP** (`libs/altitude-mcp/`) — 8 tools for agents and editors (component
  discovery, markup validation, tokens, icons, theme generation, Figma parity). Runs in
  stdio mode via `.mcp.json`, and in HTTP mode on :6017 alongside the WC Storybook.
- **Figma ↔ code parity** — per-component status panels on the docs site and badges in
  the WC Storybook sidebar. CLIs: `pnpm run parity:projects` / `parity:seed` /
  `parity:synced <tag>` / `parity:refresh` (+ `:sl` variants). See `.altitude/PARITY.md`.
- **Claude skills** — `.claude/skills/` is tracked and ships repo-specific skills
  (e.g. `altitude-figma-sync` for Figma work, with the library's conventions and traps;
  `altitude-component-authoring` for the full add-a-component checklist).

## Deployments

### Cloudflare Pages

1. Deployments are automatically triggered when a PR is merged into `main` or when a PR is created from a feature branch.
2. The deployment is available at `https://altitude.pages.dev`, with the docs site at `https://altitude.pages.dev/docs`.
3. Each workspace is built to the root `/dist` folder when running `pnpm run build:all`.
