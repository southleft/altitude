# @southleft/al-web-components

## 2.0.0

### Packaging

Added after the changesets were consumed, so they carry no changeset id — but they
change what a consumer receives, so they belong in these notes. Every item below was
measured against a real `pnpm pack` tarball installed into a scratch consumer, not a
`--dry-run`.

- **`"type": "module"` is now declared.** The published `dist` has always been pure
  ESM, but without this field Node classes every `dist/*.js` as CommonJS. Node
  >= 22.12 sniffs module syntax by default and papered over it; on anything older,
  and in any tool that reads `type` to pick a format, the import failed. Measured:
  `node --no-experimental-detect-module -e "import('@southleft/al-web-components')"`
  failed before this and passes after.
- **`repository`, `homepage`, `bugs` and `keywords`** are now set, so the npm page
  links back to the source.
- `styles/tokens-dtcg/` and the rest of the `files` allowlist are unchanged; the
  `prepack` guarantee still holds.

### Major Changes

Two changesets (`v2-canvas-parity`, `neutral-colour-ramp`) were written against this
work after `changeset version` had already produced the 2.0.0 line. Both describe v2
itself rather than a release after it, so their notes are folded in here and the
changeset files are removed — v2 ships as one major, which is what `.altitude/SEMVER.md`
says it should be. Neither package has ever been published; 2.0.0 is the first release.

- **Bring the library in line with the v2 design canvas, in both light and dark modes.**

  **Controls now take their height from a control scale, not from padding plus
  line-height.** New `theme.size.control-sm` / `control` / `control-lg` tokens
  (32 / 40 / 48px) back `al-button`, the shared `al-input` mixin (and with it
  `al-input`, `al-textarea`, `al-select`, `al-search`, `al-combobox`), `al-chip`
  and `al-toggle-button`. Control text is 14px/1 semibold. This also fixes
  `al-button`'s outline variant rendering 42px against every other variant's
  40px — its 1px border had nothing to subtract from.

  *New API.* `al-button` gains `size` (`sm` | `lg`) and `isPill`. `al-card` gains a
  `footer` slot, a hairline border, and region padding so its header rule and tinted
  footer reach the card edge. `al-table` and `al-command-palette` accept their array
  inputs as JSON attributes, so they can be driven from static HTML and SSR rather
  than only from JavaScript.

  *Fixes.* `al-button`'s `isDisabled` set `aria-disabled` and never the native
  `disabled` attribute, so the `:disabled` opacity rule could not match and disabled
  buttons stayed clickable; `isAriaDisabled` now drives the aria-only case.
  `al-alert` tone variants painted a background but no foreground, so slotted copy
  inherited the surrounding page colour — a danger alert rendered near-white text on
  its own tint at roughly 1.05:1. `al-input-stepper`'s trailing variant rendered two
  40px controls inside a 50px box and clipped the decrement control out of sight; the
  segments now measure the 24px its WCAG 2.2 SC 2.5.8 note specifies. In dark mode,
  `border-info-weak`, `border-success-weak` and `border-danger-weak` each resolved to
  the same value as their own fill, so three of four callout borders were invisible.
  `al-tab` selected with the muted tone for both label and underline, making the
  active tab greyer than its inactive siblings. Checkbox and radio drew 2px ink rings
  rather than the hairlines the rest of the system uses. The token pipeline's
  font-weight emitter was a binary (`'Bold' ? 600 : 400`) and silently flattened any
  other weight to 400; it is now a map, and `font-weight.medium` (500) exists.

  *Visual.* Status badges are soft tints with tone-coloured text rather than
  saturated fills. Shadows are reserved for overlays: `al-alert`, `al-toggle-button`,
  `al-toggle` and inline `al-calendar` are flat, and dialog/drawer/toast/menu each
  take the overlay step the canvas actually draws. Five light-mode text roles
  deliberately keep their shipped value rather than the canvas's, which would have
  cost five WCAG AA passes and collided the meta-text colour with the disabled
  colour; each deviation is one ramp step and visually indistinguishable.

  *Breaking.* **Button and Chip moved onto an emphasis axis.** Both are now
  `bare | neutral | primary | secondary | tertiary`. `al-button`'s `danger` variant
  is **gone**, and `al-chip`'s `info` / `success` / `warning` / `danger` variants are
  **gone**. Status is carried by `al-badge` and `al-alert`, which keep those axes. A
  destructive confirm is now a primary button with destructive copy. Button's
  `secondary` also changed appearance: it was a primary-tinted "tonal" fill and now
  uses the secondary colour role.

  **`--al-font-weight-bold` changed value, 600 -> 700.** What the library called
  "bold" always emitted 600, which is semibold. `semibold` (600) now exists as its own
  weight and every shipped call site moved to it, so nothing re-renders — but any
  consumer reading `--al-font-weight-bold`, or including an
  `al-theme-typography-*-bold` mixin, now gets 700. The 600 mixins are `-semibold`;
  `-medium` (500) was added alongside.

  **Type presets are named for their role, not a size.** Every
  `--al-typography-preset-<number>` custom property and matching
  `.al-typography-preset-<number>` utility class is renamed to
  `body-xs | body-sm | body-md | body-lg | heading-sm | heading-md | heading-lg |
  display-sm | display-md | display-lg`. The numbers had drifted off the sizes they
  named (`preset-36` held 28px).

  **Colour primitives renumbered to a 100-900 ramp** and the `color/brand/*`
  namespace removed; the eight hue families are addressed by role (`primary`,
  `secondary`, `tertiary`, `danger`, `warning`, `success`, `info`, `neutral`). The
  theme engine's generated palette follows (`--al-color-brand-blue-*` ->
  `--al-color-primary-*`).

  **Removed tokens:** `--al-font-size-13`, `-15` and `-18` (migrated to 12, 16 and
  20); `--al-color-transparent-{dark,light}-*` (collapsed to a single
  `--al-color-transparent-0`, with the mode axis doing the work); `--al-color-shadow-*`
  (now `--al-theme-color-shadow-*`).

  **Renamed semantic tokens:** `background-default-stronger` ->
  `background-default-bold`; `background-primary-weak` -> `background-primary-faint`;
  `background-primary-weak-strong` -> `background-primary-weak`.

- **Colour tokens: `default` is now `neutral`, and every semantic family has a
  five-step ramp.**

  `theme.color.{background,content,border}.default*` are renamed to `neutral-*` —
  `--al-theme-color-background-default` is now
  `--al-theme-color-background-neutral-default`, `-default-weak` is `-neutral-weak`,
  and so on for every step across background, content and border. The old names are no
  longer emitted. Find-and-replace the `color-{background,content,border}-default`
  prefix with the `-neutral-` form.

  `primary`, `secondary`, `tertiary`, `info`, `success`, `warning` and `danger` now
  each carry `faint` / `weak` / `default` / `strong` / `bold` on all three surfaces
  (63 new tokens; `tertiary` is new to tier 2). Existing steps keep their values. The
  Figma variables carry both changes. See MIGRATION.md §11.

- 5bf9cd7: **Removed `stretchItems` from `<al-layout>`.** It had zero call sites across the
  entire repo, and the only two places in app code that mentioned it were comments
  explaining why it did not fit. Its rule (`::slotted(*) { width: 100% }` plus
  `--al-button-width: 100%`) was also duplicated verbatim inside `responsive`,
  which keeps that behaviour for the case it was actually used for.

  Migration: if you set `stretchItems`, use `responsive` (same rule, applied below
  the small breakpoint) or `.al-u-grid__item` on the children you want stretched —
  that utility is `display: grid`, so it fills the track on BOTH axes, which
  `stretchItems` never did.

  Also in this release, no API change: the contract-to-Figma generator now derives
  a node's auto-layout axis from its CSS `display` rather than from
  `flex-direction` (which computes to `row` on every non-flex element, so every
  block-level container was generating as a horizontal row — 327 of 680 anatomy
  nodes across 53 components). `flex-wrap` now reaches Figma as `layoutWrap`.

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

- 865aad5: v2 form controls: floating labels retired, stepper redrawn, inset-label variant added

  The three parts of the v2 canvas that change markup rather than values. Paired with
  `v2-visual-language`, which moved the tokens; this one moves the structure.

  **Floating labels are gone.** `al-input`, `al-textarea`, and — through the inputs they
  compose — `al-select`, `al-search`, `al-combobox`, `al-date-picker`, `al-date-time-picker`,
  `al-file-upload` and `al-pagination` now render a top-aligned label in normal flow. The
  label was absolutely positioned inside the field and moved above the border on
  focus/value, painting a background patch to punch a hole through that border, plus a
  second `::before` patch for the disabled case. All of it is deleted. The label is lifted
  OUT of `.al-c-input__container`, which matters structurally: `__before` / `__after` are
  absolutely centred against that container, so a label inside it would drag slotted icons
  off-centre.

  **`hideLabel` no longer reveals the placeholder.** It now hides the label _visually_
  (clip-based) while keeping the element and its `for` association in the accessibility
  tree, so the field keeps its accessible name. The placeholder used to be hidden by
  default and revealed only under `.al-has-hidden-label`, because the floating label sat in
  its position; that coupling is gone and a `placeholder` renders whenever it is set.
  Verified across 12 stories and pinned by four new unit tests.

  **`isActive` is deprecated on `al-input` and `al-textarea`.** It existed to float the
  label. It is still derived and `.al-is-active` is still emitted — deliberately, so
  consumer CSS keyed on that hook does not break silently — but nothing in the library
  styles it, and it goes in the next major. `al-select` and `al-search` no longer forward it
  to their inner input; their own `isActive` is unaffected. Note the name was always a
  misnomer here: everywhere else in the library `isActive` means open/expanded.

  **New: `al-input labelPosition="inset"`.** The canvas's replacement for the floating
  label — the label sits inside the field's top padding, above the value, and is STATIC. It
  renders identically in every state, so there is no jump on focus and no border patch.

  **`al-input-stepper` is a segmented control.** One bordered box divided into
  decrement | value | increment by hairlines, with the value in the mono metadata face so
  digits do not shift sideways under the buttons. Previously the buttons were absolutely
  positioned on top of the input, the input carried `xxxl` inline padding to clear them, and
  an invisible `::after` tried to auto-size the box from `attr(data-value)` — an attribute
  nothing has ever set. That dead rule is removed.

  **New: `al-input-stepper variant="trailing"`.** The value takes the full width and both
  steppers stack at the trailing edge, for table rows. It defaults to **50px tall, not the
  40px the canvas draws**: two stacked controls in 40px are 20px each, under the 24×24
  minimum in WCAG 2.2 SC 2.5.8, and neither exception applies. 50px rather than 48px because
  the box is `border-box` — 48px minus the 1px top and bottom border leaves 46px of content,
  which splits into two 23px rows (measured, after a first pass assumed otherwise).
  `--al-input-stepper-block-size` is the escape hatch.

  New per-component custom properties: `--al-input-background`,
  `--al-input-inset-min-height`, `--al-input-stepper-block-size`,
  `--al-input-stepper-button-size`, `--al-input-stepper-value-width`.

  Accessibility is measured, not assumed: `a11y:report` goes from 18 contrast findings to
  16, structural stays at 0, and every remaining finding is a `--Disabled` story, which
  WCAG 1.4.3 exempts.

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

- 69aefdd: v2 visual language: flat, minimal, type-first

  The base theme is restyled to the approved "Altitude v2 Components" canvas — hairline
  borders on warm paper neutrals, one refined blue, shadows reserved for surfaces that
  genuinely float, Public Sans for UI and IBM Plex Mono for the metadata layer. **This
  changes how every unbranded consumer renders.** The `southleft` brand is unaffected and
  was verified byte-identical on type, hue and shadow tint.

  **Typefaces.** `font-family.primary` is now `Public Sans` (was `IBM Plex Sans`), and
  `font-family.mono` now leads with `IBM Plex Mono`. `styles/main.scss` fetches both.
  IBM Plex Sans is no longer in the base bundle — a new tier-1 primitive
  `font-family.plex` pins it so the `southleft` brand keeps its face, and consumers of that
  brand must now load it themselves (this repo does so in `apps/southleft` and `apps/docs`).

  **Palette.** Five tier-1 ramps are added — `stone` (warm neutrals, one ramp serving both
  modes), `cobalt`, `jade`, `ochre`, `crimson` — and every tier-2 semantic colour is
  re-pointed onto them in both modes. Nothing existing was renamed or re-valued, so the v1
  ramps (`blue`, `green`, `orange`, `red`, `paper`, `ink`, `taupe`) remain for anyone
  referencing them directly.

  **Shape and elevation.** The default radius moves 4px → 6px (controls), `lg` 8px → 12px
  (cards); chips and badges are pills. Four single-stop elevation stops replace stacked
  shadows at the semantic layer: cards are flat, and only dialog/drawer/popover/menu/tooltip
  carry a shadow.

  **Accessibility.** A new gate, `pnpm run check:palette-contrast`, measures 58 real
  foreground/background pairings — each traced to the call site that renders it — across
  both modes. It found ten failures the existing gates structurally could not see, and all
  ten are fixed: `verify-contrast-axis` only exercises the `contrast=` axis against
  hardcoded colours, `check-token-usage` proves a token is wired but not that it is legible,
  and VRT goes green again the moment baselines are recaptured after a deliberate restyle.

  Two consequences worth calling out:

  - `content.<hue>-weak` is the ink that sits ON `background.<hue>-default` (26 call sites
    across button/badge/chip/checkbox/radio/calendar), not a muted tint. v2's light-mode
    fills are saturated, so those inks flipped to white — except on `warning`, whose fill is
    a bright amber and keeps dark ink. A brand overriding these must respect that role.
  - `contrast="more"` now raises `opacity.disabled` to `1.0` (was `0.8`). The v2 muted ink
    and page are both lighter, and no alpha below 0.96 clears AA on that pairing; the
    default (`contrast` unset, 0.4) is unchanged and still carries the disabled affordance.

  **Also:** `tier-2/brand/altitude/colors.json` is deleted. It restated base values, which
  stopped being a no-op once the primary role became mode-dependent — its single
  mode-agnostic `content.primary-weak` line outranked the mode axis by specificity and
  pinned dark ink into the light bundle. Overriding nothing makes the "altitude === base"
  guarantee structural rather than maintained; both brand bundles still emit, byte-identical
  to base.

  Floating labels, the `input-stepper` redesign and the inset-label variant are deliberately
  NOT in this release — they are markup/API changes, tracked separately.

### Minor Changes

- 4166441: Tokens Studio removed; `styles/tokens-dtcg/` is now the hand-authored token source

  The legacy Tokens Studio tree (`styles/tokens/`, `value`/`type` shape) and its converter
  `scripts/convert-tokens-to-dtcg.js` are deleted. `styles/tokens-dtcg/` — already the
  published `./tokens-dtcg/*` subpath export — is now tracked, hand-authored and editable
  rather than generated and gitignored. The Tokens Studio plugin manifests
  (`$metadata.json`, `$themes.json`) and the dead `ingest-tokens-from-studio.js` are gone,
  as is the `build:tokens:v5` alias.

  **Consumer-visible:** every token in the published `tokens-dtcg/*` export gains a new
  `$extensions["org.altitude.token"].cssType` field naming the CSS surface the token was
  authored for. This is additive — no existing field changes.

  It exists because DTCG `$type` is deliberately coarse: `sizing`, `spacing`,
  `borderRadius`, `borderWidth`, `fontSizes` and `lineHeights` all collapse into
  `dimension`, so `$type` alone cannot say whether a `dimension` token is a width, a
  padding, a radius, a font-size or a border width. `cssType` carries that intent and is
  what drives each token's `com.salesforce.styling.cssProperties` allow-list; without it
  163 of 555 tokens would publish with no allow-list at all.

  No change to emitted CSS: `styles/dist/` and `styles/dist-v5/` are byte-identical
  across this change (38 files verified before and after), and the `exports`/`files`
  surface is unchanged.

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
    `--al-theme-color-background-neutral-default: #161616` where the dark bundle says
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
