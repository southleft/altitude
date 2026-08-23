# Changelog

All notable changes to the Altitude design system (`@southleft/al-web-components` and
`@southleft/al-react`) are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Entries below the **[Unreleased]** heading are aggregated from individual
changeset files in `.changeset/` at release time (see `NEXT-GEN-UPGRADE-PLAN.md`
task T6.4). Hand-written entries below preserve the pre-changeset history.

---

## [Unreleased] — v2 release candidate

The v2 refactor on `feature/v2` is feature-complete. The full plan lives in
`NEXT-GEN-UPGRADE-PLAN.md`; the release rollup will land via the changesets at
T6.4 publish time.

### Added
- Scoped `<al-theme brand mode density contrast motion>` host with CSS cascade
  layers (`@layer al.reset, al.base, al.theme, al.component, al.override`).
  Multiple brands coexist per subtree (T4.1, T4.2).
- `registerAltitude({ mode, suffix?, prefix? }, elements)` registry with explicit
  `stable` / `versioned` / `manual` modes (T4.6).
- Headless ReactiveControllers for dialog, menu, tabs, tooltip (T5.1).
- SSR via `@lit-labs/ssr` with Declarative Shadow DOM; `apps/ssr/` reference
  fixture (T5.2). Browser matrix in `.altitude/SSR.md`.
- Custom Elements Manifest (CEM) generation via
  `@custom-elements-manifest/analyzer`, per-component JSON schemas, contract
  validator (`scripts/validate-contracts.js`), and AI agent contracts
  (`AGENTS.md` + `llms.txt`) (T3.1–T3.4).
- Bundle-size budget gate at `.altitude/bundle-budget.json` (T6.3).
- Visual parity sweep harness at `scripts/visual-parity-sweep.mjs`.

### Changed
- **`al-header` and `al-footer` no longer own arrangement.** Both are reduced to
  their landmark plus chrome and expose a single default slot; a page composes
  the bar or the footer rows with `<al-layout>`. **Breaking:**
  - `al-header` drops the `before` / `after` slots. Their stylesheet forced the
    three regions into equal `flex: 1` thirds with `justify-content:
    space-between`, so any header whose regions were not equal thirds (a
    wordmark, a long nav and an action cluster) could not be built.
  - `al-header` drops the `::slotted(svg) { max-width: 200px }` cap on brand
    marks, and its fixed `height` becomes an overridable `min-block-size` so a
    wrapping header grows instead of clipping.
  - `al-header` gains `sticky` and `elevated` props. Both behaviours were
    previously unconditional CSS with no way to opt out; **they are now off by
    default**, so existing headers must add the attributes to keep their
    appearance.
  - `al-footer` drops the `logo` / `legal` / `social` slots and the fixed
    two-row structure. The border between the rows is now an `<al-divider>` the
    page places.
- **`al-text-passage` is renamed `al-text-block`** (`ALTextPassage` →
  `ALTextBlock`, `.al-c-text-passage` → `.al-c-text-block`).
- **`al-toast`'s `onToastGroupOpen` event is renamed `onToastOpen`**, now that
  no toast group exists to name.
- **Package manager**: yarn 1.22 → **pnpm 9** workspaces with `link-workspace-packages=deep`
  (T2.3.a).
- **Builder**: webpack 5 + babel + sass-loader → **Vite 5** for both libraries and
  both Storybooks (T2.1, T2.2). The webpack config is removed.
- **Storybook**: 7.6 → **10.4** with `@storybook/web-components-vite` /
  `@storybook/react-vite` (T2.4). Addons trimmed to `@storybook/addon-a11y` +
  `@storybook/addon-docs`; Storybook Test runner + axe-playwright a11y wired.
- **Sass**: 1.70 → **1.101** with the modern `@use` / `@forward` module system
  across 91 `.scss` files; Vite's SCSS preprocessor switched to the
  `modern-compiler` API (zero deprecation warnings in build output).
- **Tokens**: Style Dictionary 3 → **5** (DTCG `$value`/`$type` source); byte-
  identical `--al-*` output preserved via custom transform groups (T1.1).
- **Node**: 20 → **22.18 LTS** (pinned via `.nvmrc`).
- **Lit**: 3.1 → **3.3**. **TypeScript**: 5.3 → **5.9**. **date-fns**: 3 → **4**.
  **ESLint**: 8 → **9** flat config + typescript-eslint 8.
- **React**: 18.2 → **19** across `@southleft/al-react` + the React fixture app.
- `ALElement.getSharedThemeSheet()` now adopts only the ~7 KB utility CSS
  (`styles/shadow-utilities.scss`) into every shadow root, instead of the
  legacy 43 KB main.scss — enables scoped-complete components without
  breaking the styleModifier utility-class consumers (T4.3).

### Fixed
- `<al-layout variant="constrained">` placed a `display: contents` child — which
  is every composite in the library, `al-layout` included — into the gutter
  track instead of the content column. `grid-column` needs a box; the host
  generated none, its inner box became the real grid item, and `::slotted()`
  could not reach it. Nested layouts inside a constrained measure now sit in the
  content column, and `bleed` breakout still works. `variant="grid"` and
  `variant="bento"` were unaffected.
- Resource Hub demo regained its `<al-divider>` 24 px gap by routing
  utility classes through the scoped utility sheet rather than the
  removed global one.
- Foundations/Icons/Icon Font + Icon Svgs stories now render the full
  table (replaced webpack-only `require('!!raw-loader!…')` and
  `require.context` with Vite-native `?raw` and `import.meta.glob({eager:true})`;
  inlined `<tr><td>` rows so the table layout actually works inside the
  outer shadow DOM).
- Restored 7 MDX docs pages (5 Foundations + Resources/Changelog +
  Resources/Documentation) lost in the SB7→10 migration. Includes a Vite
  resolver plugin that strips the `file://` prefix that `@storybook/addon-docs`
  generates under pnpm's symlinked layout.

### Removed
- `al-chip-group` and `al-toast-group`. Both owned real behaviour — the "+N"
  overflow counter, and viewport-fixed positioning plus auto-close — but nothing
  in the system used it. Replace `<al-chip-group>` with
  `<al-layout direction="row" wrap>`; `<al-toast-group>` has no replacement,
  position `<al-toast>` yourself.
- `Resources/Theme Presets` Storybook page (`.storybook/docs/THEMING.mdx`).
- Webpack configs and the entire babel toolchain.
- `ALElement.getGlobalStyles()` document `<style id="al-tokens-sheet">`
  regex-strip path (T4.3).
- Style Dictionary v3 `tokens-config.js` (T6.2).
- `wca` (legacy `web-component-analyzer`) — replaced by
  `@custom-elements-manifest/analyzer` (T3.1).
- 7 Storybook 7 addons that were absorbed into SB10 core
  (`addon-essentials`, `addon-interactions`, `blocks`, `manager-api`,
  `theming`, `addon-coverage`, `addon-status`).

## [1.0.0] — pre-v2 baseline

Initial public release on the legacy stack (Lit 3.1, webpack, Storybook 7,
Style Dictionary 3, Yarn 1, React 18). See git history before 2026-06-15 for
detailed pre-v2 commits.

---

<!-- USE THIS AS THE TEMPLATE FOR PRE-v2 HAND-WRITTEN RELEASES (deprecated;
     prefer changesets via `pnpm dlx changeset`)

## Next Release - YYYY-MM-DD

### Added

### Modified

### Removed -->
