# Build pipeline — webpack + Vite parallel (Phase 2)

## Overview

T2.2 swapped the *capacity* to build via Vite without yet retiring webpack.
Both pipelines coexist during this transition, much like the SD v3 / v5
token pipelines (see `.altitude/TOKENS.md`).

| Builder | Source | Output | Purpose |
|---|---|---|---|
| webpack 5 + babel + sass-loader | `libs/al-web-components/components/**/*.ts` (legacy SCSS imports) | `libs/al-web-components/dist/` | Ships the live `1.0.0` publish surface |
| Vite 5 (esbuild + Rollup) | Same source via the in-memory `?inline` rewrite plugin | `libs/al-web-components/dist-vite/` | The Vite-built parallel that T2.2 builds and Gate P2 lands on |

The Vite config preserves G7 (decorator semantics): `experimentalDecorators: true`,
`useDefineForClassFields: false`, esbuild target `es2022`.

## Commands

```bash
# Workspace-relative:
yarn workspace al-web-components build              # legacy webpack
yarn workspace al-web-components build:vite         # T2.2 Vite (parallel)
yarn workspace al-web-components build:vite-spike   # T2.1 single-component spike

# Top-level gates:
node scripts/check-vite-spike.js                    # T2.1 bundle assertions
node scripts/check-vite-export-parity.js            # T2.2 zero public-export removals
```

## Acceptance hit by Phase 2 so far

| Task | Acceptance | Status |
|---|---|---|
| T2.1 | SCSS compiles to constructable stylesheet that lands in shadow root | ✅ `check-vite-spike.js` PASS |
| T2.1 | VRT matches P0 baseline within tolerance | ✅ pilot VRT passes when dist is swapped from webpack to Vite output |
| T2.2 | `yarn build` exits 0 (vite is added; webpack still works) | ✅ `yarn workspace al-web-components build:vite` exits 0 in 1–2s |
| T2.2 | API-extractor/AST diff = zero public export removals | ✅ `check-vite-export-parity.js` PASS — 103 files compared |
| T2.2 | `publint` 0 errors | ⚠ Deferred — publint flags pre-existing missing `main`/`exports`/`types` fields. Resolving these requires choosing the `dist/` source of truth (currently webpack; Vite swap completes the work). Tracked for T2.2 final |
| T2.2 | Pilot stories render | ✅ pilots-VRT against Vite-built button/input/select/dialog/theme-switcher pass |

## How the rewrite plugin works

`libs/al-web-components/components/<name>/<name>.ts` source today uses:

```ts
import styles from './<name>.scss';
static get styles() { return unsafeCSS(styles.toString()); }
```

Webpack reads this via `sass-loader` + `raw-loader` and produces an object
whose `.toString()` returns the compiled CSS. Vite's equivalent is the
`?inline` query (Vite's canonical "raw string from this asset" mechanism).
Changing 64 components in this PR would be its own commit-soup; instead the
Vite plugin rewrites the import in memory before esbuild sees it:

```js
import styles from './x.scss'        →        import styles from './x.scss?inline'
```

The trailing `.toString()` in the static-styles getter is a no-op on the
returned string, so the line stays unchanged. T6.2 (post-Phase-6 cleanup)
will codemod the source files so the rewrite plugin is no longer needed.

## What's not yet covered

- **Production `dist/` swap.** `build:vite` writes to `dist-vite/` instead of
  replacing `dist/`. The swap is intentionally deferred until T3.4's contract
  validator lands so the cutover is gated by a robust check.
- **`setGlobalStyles.ts`** uses webpack-specific loader syntax
  (`!!raw-loader!sass-loader!../styles/main.scss`). It is excluded from the
  Vite entry list; the legacy webpack build still emits it, and T4.3 removes
  the global-style approach entirely.
- **publint clean.** Closes when the dist swap lands (the package's
  `main`/`exports`/`types` need real file paths; today the absent fields are
  a pre-existing characteristic of the legacy package).
- **T2.3, T2.4 — yarn1→pnpm, Lit 3.3, TS, ESLint 9 flat, date-fns 4,
  Storybook 10.** These follow the build foundation.
