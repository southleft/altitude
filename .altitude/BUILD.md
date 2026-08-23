# Build pipeline — Vite 5 (post-Phase 2)

## Overview

After T2.1 / T2.2 / T2.4, both libraries and both Storybooks build through
**Vite 5**. The legacy webpack 5 + babel + sass-loader pipeline that shipped
1.0 is retired; its configs are removed from the repo.

| Surface | Builder | Config | Output |
|---|---|---|---|
| `@southleft/al-web-components` library | Vite 5 (esbuild + Rollup) | `libs/al-web-components/vite.config.mjs` | `libs/al-web-components/dist/` |
| `@southleft/sl-web-components` library — the Southleft **brand layer** | Vite 5 (esbuild + Rollup) + `tsc` | `libs/sl-web-components/vite.config.mjs` | `libs/sl-web-components/dist/` (JS under `dist/components/**`, declarations under `dist/sl-web-components/components/**` — see the `exports["."]["//"]` note in its `package.json`, not a typo) |
| `@southleft/al-react` library | Vite 5 | `libs/al-react/` (default config) | `libs/al-react/dist/` |
| `@southleft/al-web-components` Storybook | Storybook 10 + `@storybook/web-components-vite` | `libs/al-web-components/.storybook/main.ts` | `dist/storybook/web-components/` |
| `@southleft/al-react` Storybook | Storybook 10 + `@storybook/react-vite` | `libs/al-react/.storybook/main.ts` | `dist/storybook/react/` |

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
pnpm --filter @southleft/al-web-components build                            # @southleft/al-web-components → dist/
pnpm --filter @southleft/al-react build                                     # @southleft/al-react → dist/
pnpm run build                                                   # both libraries

# Storybook builds:
pnpm --filter @southleft/al-web-components start                            # dev server :6006
pnpm --filter @southleft/al-web-components build:storybook \
    --output-dir ../../dist/storybook/web-components             # static export
pnpm --filter @southleft/al-react start                                     # dev server :9009
pnpm --filter @southleft/al-react build:storybook \
    --output-dir ../../dist/storybook/react

# Everything:
pnpm run build:all                                               # libs + both SBs + apps
```

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
  CSS (Storybook preview consumes it). Forwards Sass variables + mixins to
  downstream consumers like `.storybook/docs.scss`.
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
| T2.4 | Storybook 10 with Vite framework, Storybook Test runner, axe-playwright a11y | ✅ |

See the PR body and `CHANGELOG.md` `[Unreleased]` for the full rollup.

## Notes for future agents

- The legacy `setGlobalStyles.ts` that used webpack-only `!!raw-loader!sass-loader!`
  syntax is **gone** — `ALElement.getSharedThemeSheet()` is the replacement.
- The library `dist/` is the source of truth for consumers; there is no
  separate `dist-vite/` parallel anymore (it was the T2.2 staging output and
  was retired at T2.2 finalization).
