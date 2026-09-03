# Build pipeline — Vite

## Overview

Everything builds through **Vite** (`^7.1.12` in both libraries as of
2026-09-02; this doc read "Vite 5" until then). The legacy webpack 5 + babel +
sass-loader pipeline that shipped 1.0 is retired; its configs are removed from
the repo.

| Surface | Builder | Config | Output |
|---|---|---|---|
| `@southleft/al-web-components` library | Vite (esbuild + Rollup) | `libs/al-web-components/vite.config.mjs` | `libs/al-web-components/dist/` |
| `@southleft/sl-web-components` library — the Southleft **brand layer** | Vite (esbuild + Rollup) + `tsc` | `libs/sl-web-components/vite.config.mjs` | `libs/sl-web-components/dist/` (JS under `dist/components/**`, declarations under `dist/sl-web-components/components/**` — see the `exports["."]["//"]` note in its `package.json`, not a typo) |
| `@southleft/al-react` library | `tsc` (+ an asset copy step) — **not** Vite, despite the devDependency | `libs/al-react/tsconfig.json`, `libs/al-react/scripts/copy-dist-assets.mjs` | `libs/al-react/dist/` |
| Story fixture — the isolated render surface | Vite | `libs/al-web-components/story-fixture/vite.config.mjs` | `libs/al-web-components/story-fixture/dist/` |
| Docs site | Astro + Pagefind | `apps/docs/astro.config.mjs` | `dist/docs/` |

**Both Storybooks were retired on 2026-08-25** and their `.storybook/`
directories deleted. Nothing replaced them as a component explorer; the story
fixture took over the one job that had to survive — rendering every story so axe
can measure it — and serves the same `index.json` + `iframe.html?id=` contract
the old static Storybook build did.

The root `build` script chains all three libraries **in order** —
`@southleft/al-web-components` → `@southleft/sl-web-components` →
`@southleft/al-react` (`package.json:19`) — because the brand layer imports
Altitude's `ALElement` and other sources by **relative path**, not by package
specifier (`libs/sl-web-components/vite.config.mjs:80-97`), and its own docs
page (`/docs/southleft`) now depends on its build succeeding. Its **custom
elements manifest is not part of this build** — see `.altitude/BRAND-LAYER.md`
§ "THE TRAP" before changing a brand component's public API.

The Vite config preserves **G7** (decorator semantics): `experimentalDecorators: true`,
`useDefineForClassFields: false`, esbuild target `es2022`.

## Commands

```bash
# Library builds:
pnpm --filter @southleft/al-web-components build                 # → libs/al-web-components/dist/
pnpm --filter @southleft/al-react build                          # → libs/al-react/dist/
pnpm run build                                                   # all three libraries, in order

# Story fixture (replaced the Storybook static build, retired 2026-08-25):
pnpm --filter @southleft/al-web-components start:fixture         # dev server
pnpm run build:story-fixture                                     # static build
pnpm run a11y:report:fixture                                     # build it, then axe it

# Docs site:
pnpm --filter al-app-docs start                                  # :6120/docs
pnpm --filter al-app-docs build                                  # → dist/docs

# Everything (this is the Cloudflare Pages build command — output dir dist/):
pnpm run build:all                                               # libs + docs + pages-root + the fixture apps
```

`build:all`'s step order is load-bearing rather than alphabetical; the
`//build:all` comment in the root `package.json` is the authority on why.

## SCSS handling

Vite ingests `*.scss` natively. The Vite config switches the SCSS preprocessor
to Sass's **`modern-compiler`** API (`css.preprocessorOptions.scss.api`), so
there are no `legacy-js-api` deprecation warnings. The SCSS source itself uses
the modern Sass module system — every `@import` was migrated to `@use` /
`@forward` so Dart Sass 3.0 (which removes `@import`) won't break the build.

Component `.ts` files keep the simple form:

```ts
import styles from './<name>.scss';
static get styles() { return unsafeCSS(styles.toString()); }
```

A small Vite plugin (`rewriteScssImports` in `vite.config.mjs`) appends
`?inline` to those imports in memory so Vite returns the compiled CSS as a
string. Keeping the source spelling identical to webpack's avoids touching
65 components for a build-tool change.

## SCSS structure

- `libs/al-web-components/styles/main.scss` — entry: emits the full theme
  CSS (it hard-codes the **dark** sheet, `@use './dist/scss/theme/tokens-dark.scss'`),
  and forwards Sass variables + mixins to downstream consumers. Built to
  `dist/css/main.css`, which is what `apps/docs`, `apps/southleft` and the story
  fixture load. (The `.storybook/docs.scss` consumer named here previously went
  with Storybook, retired 2026-08-25.)
- `libs/al-web-components/styles/component.scss` — consumed by every leaf
  component. `@forward`s variables + mixins; `@use`s reset so its CSS gets
  emitted in each component's scoped sheet.
- `libs/al-web-components/styles/shadow-utilities.scss` — adopted into every
  component's shadow root by `ALElement.getSharedThemeSheet()`. Carries
  only the `.al-u-*` utility classes (~7 KB) so components that accept
  utility values via `styleModifier` keep working without each one needing
  to import the utilities locally.
- `libs/al-web-components/styles/core/` — partials (reset, variables, mixins,
  utilities, layers) — all `@use` / `@forward` module-system files.

## Acceptance status

All Phase 2 acceptance criteria are green and merged on `feature/v2`:

| Task | Acceptance | Status |
|---|---|---|
| T2.1 | SCSS compiles to constructable stylesheet adopted into shadow root | ✅ |
| T2.2 | `pnpm --filter @southleft/al-web-components build` exits 0 via Vite (webpack retired) | ✅ |
| T2.2 | AST diff = zero public export removals vs P0 dist | ✅ |
| T2.2 | publint 0 errors | ✅ |
| T2.3 | yarn → pnpm 9, Node 22 LTS, Lit 3.3, TS 5.9, ESLint 9, date-fns 4 | ✅ |
| T2.4 | Storybook 10 with Vite framework, Storybook Test runner, axe-playwright a11y | ✅ then **REVERSED** — Storybook retired 2026-08-25; the a11y sweep moved to the story fixture (`a11y:report:fixture`) |

Historical record: these are Phase-2 acceptance criteria from the v2 refactor,
whose plan is archived at
[`history/NEXT-GEN-UPGRADE-PLAN.md`](./history/NEXT-GEN-UPGRADE-PLAN.md). See the
PR body and `CHANGELOG.md` for the full rollup.

## Notes for future agents

- The legacy `setGlobalStyles.ts` that used webpack-only `!!raw-loader!sass-loader!`
  syntax is **gone** — `ALElement.getSharedThemeSheet()` is the replacement.
- The library `dist/` is the source of truth for consumers; there is no
  separate `dist-vite/` parallel anymore (it was the T2.2 staging output and
  was retired at T2.2 finalization).
