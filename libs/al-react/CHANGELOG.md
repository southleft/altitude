# @southleft/al-react

## 2.0.0

### Packaging

Added after the changesets were consumed, so they carry no changeset id — but they
change what a consumer receives, so they belong in these notes. Every item below was
measured against a real `pnpm pack` tarball installed into a scratch consumer, not a
`--dry-run`.

- **`"type": "module"` is now declared.** The published `dist` has always been pure
  ESM, but without this field Node classes every `dist/*.js` as CommonJS. Node
  >= 22.12 sniffs module syntax by default and papered over it; on anything older,
  and in any tool that reads `type` to pick a format, the import failed. Verified
  against a packed tarball with Node's syntax detection explicitly disabled
  (`node --no-experimental-detect-module`).
- **`repository`, `homepage`, `bugs` and `keywords`** are now set, so the npm page
  links back to the source.
- **`react` and `react-dom` are now `peerDependencies`, not `dependencies`.** As plain
  dependencies a consumer's installer was free to resolve a SECOND copy of React
  beneath this package — two React instances in one tree, which surfaces as
  `Invalid hook call` and a dead context boundary — and nothing would have warned,
  because the constraint was satisfied locally. If you install this package on its
  own, install `react` and `react-dom` (`^19`) alongside it.
- **The emitted ESM is now loadable by Node.** `tsc` does not rewrite specifiers, so
  extensionless and directory imports reached `dist` verbatim: importing this package
  in Node threw `ERR_UNSUPPORTED_DIR_IMPORT` on the root entry and `ERR_MODULE_NOT_FOUND`
  on every component subpath. Bundlers resolved them, which is why it went unnoticed.
  312 specifiers now carry an explicit `.js` / `/index.js`, and the internal
  `package.json` imports carry `with { type: 'json' }`. No public API changed.

### Major Changes

- af9fad9: Replace the 37 hand-authored icons with the full Phosphor set (1,512 icons, regular weight, MIT) via a new `@phosphor-icons/core` devDependency.

  **New canonical API.** `<al-icon name="caret-down">` resolves against a registry. Register the icons you use for a tree-shakeable, synchronous, SSR-safe render:

  ```ts
  import { caretDown } from "@southleft/al-web-components/dist/components/icon/glyphs.js";
  import { registerIcons } from "@southleft/al-web-components/dist/components/icon/registry.js";
  registerIcons({ "caret-down": caretDown });
  ```

  Opt into `@southleft/al-web-components/dist/components/icon/lazy.js` when icon names come from data you don't control.

  **Breaking:**

  - The 37 `<al-icon-*>` elements and `ALIcon*` React wrappers still exist and are still exported, but now render Phosphor artwork — **icons look different**, and Phosphor's regular weight is heavier than the old line work. They are deprecated and will be removed in 3.0.
  - The icon webfont is removed. `.icon-<name>` classes and the `iconfont` `@font-face` are gone; `dist/fonts/iconfont.css` is an empty deprecation stub for one minor version.
  - `<al-icon-list>` and `<al-icon name="list">` intentionally render different artwork — name lookup checks the Phosphor catalog before the legacy alias map. Migrate to `<al-icon name="list-dashes">`.

  **Fixed:** `<al-icon>` used `aria-labelledby` for `iconTitle`, which takes IDREFs — icons with a title were announced as unlabelled. It now emits `aria-label`.

  See `MIGRATION.md` § 4b for the full legacy → Phosphor name map.

- 05896fb: `al-toggle-button-group` / `ALToggleButtonGroup` removed

  **Breaking.** The component and its React wrapper are deleted, along with its schema,
  contract, generated reference doc, docs guidance page and Figma set.

  Unlike `al-button-group` and the other arrangement-only wrappers removed before it,
  this one **did own behaviour** — that is why it survived the earlier
  "Arrangement vs. semantics" cut (AGENTS.md). Specifically it owned:

  - **single-select enforcement** — listening for `onToggleButtonSelect` and clearing the
    previously selected button's `isSelected` (`toggle-button-group.ts:81-84`)
  - **click-outside deselection** — a global `mousedown` listener that cleared the
    selection when the click landed outside the selected button (`:63`, `:96-101`)

  Nothing in the system consumed either behaviour, so it was cut rather than carried —
  the same reasoning applied to `al-chip-group` and `al-toast-group`.

  **Migration.** A row of toggle buttons is now arrangement plus explicit state:

  ```html
  <al-layout direction="row" gap="none">
    <al-toggle-button>One</al-toggle-button>
    <al-toggle-button>Two</al-toggle-button>
  </al-layout>
  ```

  `al-toggle-button` is unchanged and still dispatches `onToggleButtonSelect`. If you
  relied on the group's mutual exclusivity or click-outside deselection, that state is now
  yours to own: listen for `onToggleButtonSelect` on your container and clear the previous
  button's `isSelected` yourself.

- 2dbb294: Altitude v2 — scoped theming, AI contracts, modern toolchain.

  ## Highlights

  - **Scoped theming.** Every component reads tokens through the nearest
    `<al-theme brand mode density contrast motion>` host instead of a global
    `<style>` mutation. Adjacent `<al-theme>` subtrees compute distinct
    `--al-*` values; multi-brand pages work without subtree contamination.
    The host blocks are **deltas** over the base `:root` token sheet, so keep
    `dist/css/main.css` loaded — `<al-theme>` composes on top of it rather than
    replacing it. See `.altitude/SSR.md` and the `<al-theme>` component docs.
  - **Cascade layers.** `@layer al.reset, al.base, al.theme, al.component,
al.override` is declared up front; every component stylesheet ships in
    `@layer al.component { … }`. Author overrides land in `al.override` so
    Altitude rules never have to compete on specificity.
  - **Registry modes.** New `registerAltitude({ mode, suffix?, prefix? }, …)`
    with explicit `stable | versioned | manual` modes replaces the
    flag-driven legacy registration. The legacy `register()` export is
    preserved for backward compatibility through the 3.x line (see
    `.altitude/SEMVER.md` deprecation budget).
  - **Headless behavior controllers** for dialog/menu/tabs/tooltip — pure
    state machines that styled components host.
  - **AI contracts.** Per-component JSON schemas at
    `libs/al-web-components/schemas/` (one per migration entry); contract
    validator at `scripts/validate-contracts.js`; the agent-facing
    navigation lives in `AGENTS.md` and `llms.txt`.
  - **Modern toolchain.** Vite library build alongside webpack; SD v5
    parallel pipeline byte-identical to v3; React 19 wrappers; Lit 3.3;
    date-fns 4; TypeScript 5.9; Node 20 (target 22).

  ## Migration

  See `MIGRATION.md` at the repo root for the consumer-facing migration
  guide and codemods. Most consumers can:

  1. Wrap their root in `<al-theme>` and remove their global
     `<style id="al-tokens-sheet">` shim.
  2. Swap calls to the legacy `register({ elements, suffix })` for
     `registerAltitude({ mode: 'stable' }, elements)`.
  3. Pin `react / react-dom` to `^19` if consuming `@southleft/al-react`.

  The 1.x → 2.x migration is staged across all 65 components in
  `.altitude/migration.json`; CI rejects feature work on components that
  haven't crossed to `scoped-complete`.

### Minor Changes

- eed9f81: Add a marketing-organism layer so Altitude serves marketing sites as well as
  product UIs: `al-split-content` (two-column media/content band), `al-bento-grid`
  - `al-bento-item` (asymmetric feature grid), `al-footer` (site footer,
    composes `al-list`/`al-link`), `al-stat` (single KPI tile with trend delta —
    compose several into a "KPI band"), `al-testimonial` (quote + attribution,
    composes `al-avatar`), `al-banner` (page-level, full-width announcement bar,
    distinct from `al-alert`), and `al-empty-state`. Also extends `al-hero`
    additively with `contentAlignment` and an opt-in poster `overlay` scrim — zero
    visual change to existing usage. Each new component ships with a React
    wrapper, Storybook stories, and a `scoped-complete` migration.json entry.
- 275160d: `<al-theme brand>` now actually applies tokens, and three inert rules in
  `theme.scss` are fixed.

  **New capability.** The token pipeline emits `:host([brand='x'])`,
  `:host([brand='x'][mode='y'])` and `:host([mode='y'])` partials into
  `styles/dist-v5/scss/host/`, and `components/theme/theme.scss` consumes them.
  Two `<al-theme>` subtrees with different `brand` values now compute different
  `--al-*` values on the same page — the thing `MIGRATION.md` has documented
  since v2 and that nothing implemented. It works under
  `registerAltitude({ mode: 'versioned' })`, it works with no global sheet-swap,
  and it works server-rendered with JavaScript disabled.

  The `:root` artifacts (`dist/css/main.css`, `dist/css/theme/*`,
  `dist/css/brand/*`) are **byte-identical** — the scoped output is purely
  additive and no consumer of the flat sheet needs an edit.

  **Behaviour changes for existing `<al-theme>` users** (all bug fixes, all
  visible):

  - `mode` used to be worth exactly two properties, and both were hardcoded hexes
    that contradicted the generated tokens and beat them:
    `--al-theme-color-background-default: #161616` where the dark bundle says
    `#181818`, and `#f4f4f4` where it says `#f8f8f6`. Those literals are gone.
    `mode` now carries all 23 properties the two base themes differ on, so
    `<al-theme mode="light">` over a dark `:root` genuinely renders light instead
    of shifting two colours.
  - `motion="reduced"` and the `prefers-reduced-motion` fallback did nothing at
    all: both blocks zeroed `--al-theme-animation-duration-{2,4,6,8}`, names the
    pipeline has never emitted. Corrected to `--al-theme-animation-duration` and
    `--al-theme-animation-duration-long`, which are what all 34 component call
    sites read.
  - `density="comfortable"` was not a no-op — it wrote
    `--al-theme-space-md: 1rem` where the bundle says 1.25rem, so naming the axis
    at its own default value silently reflowed the page. The rule is removed (the
    base ramp _is_ comfortable); `compact` and `cozy` are unchanged in value.

  **Note for consumers.** The host blocks are deltas over the base `:root`
  bundle. Keep `dist/css/main.css` (or another `:root` token sheet) loaded —
  `<al-theme>` composes on top of it, it does not replace it.

  Also fixed: `dist/components/theme/theme.js` shipped as a 35-byte empty file
  because the Vite entry map spelled two different modules `theme`. The
  stylesheet entry moved to `dist/styles/theme.js` and the `<al-theme>` component
  now occupies its documented path. `css/main.css` is unchanged.

- eed9f81: Add three new components: `al-table` (sortable/selectable data table with an
  in-component horizontal scroll container), `al-combobox` (WAI-ARIA combobox
  with filtered listbox, built on the same `al-dropdown-panel`/`al-list`
  primitives as `al-select`/`al-search`), and `al-command-palette` (cmd/ctrl+k
  overlay with fuzzy search over a provided action list, built on
  `al-focus-trap`). Each ships with a React wrapper, Storybook stories, and a
  `scoped-complete` migration.json entry.
- a0912d3: Foundation for the v2 refactor (Phase 0).

  - Pinned target versions in `.altitude/targets.json` (React 19, Style Dictionary v5,
    Storybook 10, pnpm, Vite, ESLint 9 flat, date-fns 4, Lit 3.3, CEM analyzer).
  - Added LICENSE, CONTRIBUTING, SEMVER policy.
  - Wired changesets for incremental release notes.
  - (Subsequent Phase 0 tasks add the migration manifest, fixtures, and baselines.)

  No consumer-visible API change yet — this is infrastructure for the work
  that follows.

### Patch Changes

- Updated dependencies [4166441]
- Updated dependencies [5bf9cd7]
- Updated dependencies [eed9f81]
- Updated dependencies [af9fad9]
- Updated dependencies [05896fb]
- Updated dependencies [275160d]
- Updated dependencies [eed9f81]
- Updated dependencies [865aad5]
- Updated dependencies [2dbb294]
- Updated dependencies [a0912d3]
- Updated dependencies [69aefdd]
  - @southleft/al-web-components@2.0.0
