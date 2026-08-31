# Altitude 1.x → 2.x migration guide

Altitude v2 changes the theming model from a single global `<style>`
mutation to a scoped `<al-theme>` host. Most consumers can migrate in
two edits + a `pnpm upgrade`.

## TL;DR

```diff
- import { register } from '@southleft/al-web-components';
+ import { registerAltitude } from '@southleft/al-web-components';
- register({ elements: [...], suffix: process.env.VERSION });
+ registerAltitude({ mode: 'versioned', suffix: process.env.VERSION }, [...]);
```

```diff
  <body>
+   <al-theme brand="altitude" mode="dark">
      <al-button>Save</al-button>
+   </al-theme>
  </body>
```

```diff
- "react": "18.2.0"
+ "react": "^19"
```

That's the migration. The rest of this guide explains why and when.

## 1. Wrap your tree in `<al-theme>`

In v1, the `<al-theme-switcher>` mutated a global `<style id="al-tokens-sheet">`
node and `ALElement` regex-stripped that into every shadow root. v2 replaces
both with a scoped `<al-theme>` element that sets brand/mode/density/contrast
tokens on `:host`.

**Before** (v1):

```html
<body>
  <al-theme-switcher></al-theme-switcher>
  <al-button>Hello</al-button>
</body>
<!-- token bundle injected at runtime via document.head.appendChild -->
```

**After** (v2):

```html
<body>
  <al-theme brand="altitude" mode="dark">
    <al-theme-switcher></al-theme-switcher>
    <al-button>Hello</al-button>
  </al-theme>
</body>
```

Multi-brand pages? Nest:

```html
<al-theme brand="altitude" mode="light">
  <al-button>Brand A</al-button>
</al-theme>
<al-theme brand="southleft" mode="dark">
  <al-button>Brand B</al-button>
</al-theme>
```

The two buttons compute distinct `--al-*` values without touching `:root`.
That is now true and tested — `pnpm test:scoped-theming` renders exactly this
markup for both brands in one document and asserts the computed values
differ, and `.altitude/visual-compare/brands.scoped.png` is the picture. Before
`2026-07-28-scoped-token-emission-brand-wiring` it was aspirational: `brand`
was typed and documented but no `:host([brand])` rule existed, so both buttons
rendered identically.

### `<al-theme>` composes; it does not replace your token sheet

The scoped blocks are **deltas** over the base `:root` bundle — each restates
only what differs, which is what keeps all three brand×mode combinations at a
fraction of what restating them in full would cost. **Keep `dist/css/main.css`
(or some `:root` token bundle) loaded.** Without one, a brand's literal values
still apply while every `var(--al-color-*)` reference in it dangles.

Two related consequences:

- `brand` and `mode` are independent. A brand's mode-independent identity
  (type ramp, radii, spacing, border weights) lives in `:host([brand='x'])`, so
  `<al-theme brand="southleft">` with no `mode` still looks like southleft.
- A brand with no build for a mode has no block for it. Southleft is
  dark-only, so `<al-theme brand="southleft" mode="light">` renders southleft's
  shape over the light colour surface.

### Legacy fallback — DEPRECATED, removal target 3.0.0

`<al-theme-switcher>` keeps its v1 behavior — swapping a whole
`<style id="al-tokens-sheet">` into `document.head` — **only** when it finds no
`<al-theme>` ancestor. With an ancestor it takes the scoped path
(`theme-switcher.ts:109-113`), sets `brand` and `mode` on that element, and
never touches the document.

**Status: deprecated as of this release; scheduled for removal in 3.0.0.**
It is kept rather than deleted because two consumers still need it today:
`apps/web-components/index.html` uses the switcher with no `<al-theme>`
wrapper, and the Storybook `<al-theme-switcher>` stories opt out of the preset
decorator precisely so this path stays exercised. Wrap your content in
`<al-theme>` and the fallback becomes unreachable at no cost — since scoped
emission landed, the scoped path now moves **both** axes, where before it moved
only `mode`.

To opt out of the legacy path explicitly:

```js
document.querySelector('al-theme-switcher').scopedOnly = true;
```

Migration for 3.0.0: wrap in `<al-theme>`, or set `scopedOnly = true` and
drive `brand` / `mode` yourself. Once every consumer is wrapped, the six
`?inline` bundle imports at `theme-switcher.ts:15-20` and the `styles/dist/`
legacy mirror they are the last reason for can both go.

## 2. Switch to the explicit registry modes

`registerAltitude({ mode, suffix?, prefix? }, elements)` replaces the
opaque `register({ suffix })` API. The legacy export keeps working —
nothing breaks — but new code should use the explicit form.

| Need | Call |
|---|---|
| Standard `<al-button>` tags | `registerAltitude({ mode: 'stable' }, els)` |
| Coexist with another Altitude version | `registerAltitude({ mode: 'versioned', suffix: pkg.version }, els)` |
| Register manually later | `registerAltitude({ mode: 'manual' }, els)` |

`stable` is the default for new apps. `versioned` is for micro-frontends.
`manual` is for tests / SSR.

## 3. Upgrade React (if consuming `@southleft/al-react`)

```diff
- "react": "18.2.0",
- "react-dom": "18.2.0",
+ "react": "^19",
+ "react-dom": "^19",
```

@southleft/al-react's `@lit/react`-backed wrappers handle the rest. R19 + custom
elements still requires the explicit `events` map on each wrapper for
listeners to bind — every shipped wrapper already declares this.

### `<ALTheme>` — the React theming host

`@southleft/al-react` now ships a wrapper for `<al-theme>`, so a React tree can be
themed without dropping to raw custom elements:

```tsx
import { ALTheme, ALButton } from '@southleft/al-react';

<ALTheme brand="southleft" mode="dark">
  <ALButton>Label</ALButton>
</ALTheme>;
```

Two things to know.

**The tag is versioned.** `@southleft/al-react` registers with
`suffix: PackageJson.version`, so the element in the DOM is
`<al-theme-1-0-0>`, not `<al-theme>`. Anything that looks a theme host up by
tag name will not find it — including `<al-theme-switcher>`, whose
`closest('al-theme')` walk is hardcoded to the plain tag. Set the axes on
`<ALTheme>` directly rather than relying on that walk.

**Pass only the axes you mean.** `density` and `contrast` are optional;
omitting one leaves the attribute off, which is how you say "no position on
this axis". `density="comfortable"` and omitting `density` are equivalent.

`<ALTheme>` is not a bare `createComponent` wrapper like the other 65. It adds
a layout effect that mirrors the five axes to ATTRIBUTES, because `@lit/react`
sets reactive properties and every `:host([brand='…'])` / `:host([mode='…'])`
rule the tokens live in is an attribute selector. Without it the props are
accepted, the properties are correct, and nothing re-themes. See
`libs/al-react/src/components/Theme/Theme.tsx`.

### Theme presets in the React Storybook

Both Storybooks carry the same **Preset** toolbar dropdown — brand + mode +
density + contrast, snapped together — over one shared module,
`libs/al-web-components/.storybook/presets.ts`. Adding a preset there makes it
appear in both with no other edit. `parameters.alPreset = { disable: true }`
opts a story out of the wrapper.

`pnpm test:preset-parity` (`scripts/check-preset-parity.mjs`) drives both
running Storybooks through every preset and fails if the toolbars, the host
attributes, or the computed brand tokens diverge. Point it at non-default ports
with `--wc <url> --react <url>`.

The @southleft/al-react Storybook requires a built @southleft/al-web-components
(`pnpm --filter @southleft/al-web-components build`); it now says so instead of failing on
an unresolved import.

## 4. New props on existing components

- `<al-theme>` props: `brand`, `mode` (light|dark), `density`
  (compact|cozy|comfortable), `contrast` (normal|more), `motion`
  (full|reduced — falls back to `prefers-reduced-motion`).
- `<al-theme-switcher>` adds `scopedOnly` to suppress the legacy
  global-style fallback.

## 4b. Icons — Phosphor

Altitude now ships the full [Phosphor](https://phosphoricons.com) set (1,512
icons, `regular` weight, MIT) instead of 37 hand-authored SVGs.

**Existing markup keeps working.** All 37 `<al-icon-*>` elements and their
`ALIcon*` React wrappers still exist and are still exported — they now render
Phosphor artwork, so **icons will look different**. Phosphor's regular stroke is
heavier than the old Altitude line work; budget a visual pass. The elements are
deprecated and will be removed in 3.0.

New code should use the name-based API with an explicit registration, which is
tree-shakeable and renders synchronously (SSR-safe, no placeholder flash):

```ts
import { caretDown } from '@southleft/al-web-components/dist/components/icon/glyphs.js';
import { registerIcons } from '@southleft/al-web-components/dist/components/icon/registry.js';
registerIcons({ 'caret-down': caretDown });
```
```html
<al-icon name="caret-down" size="sm"></al-icon>
```

If icon names come from data you don't control, opt into the loader once —
~13 KB gzipped plus a request per icon, and it cannot render server-side:

```ts
import '@southleft/al-web-components/dist/components/icon/lazy.js';
```

### Legacy name → Phosphor name

| 1.x | 2.x | | 1.x | 2.x |
|---|---|---|---|---|
| `add` | `plus` | | `menu` | `list` |
| `attachment` | `paperclip` | | `pin` | `map-pin-simple-line` |
| `chevron-down` | `caret-down` | | `search` | `magnifying-glass` |
| `chevron-left` | `caret-left` | | `send` | `paper-plane-tilt` |
| `chevron-right` | `caret-right` | | `settings` | `gear` |
| `chevron-up` | `caret-up` | | `success` | `check-circle` |
| `close` | `x` | | `support` | `headset` |
| `document` | `file-text` | | `warning-triangle` | `warning` |
| `dots-horizontal` | `dots-three` | | `emoji` | `smiley` |
| `dots-vertical` | `dots-three-vertical` | | `filter` | `funnel` |
| `help` | `question` | | `home` | `house` |
| `layout-masonry` | `squares-four` | | `list` | `list-dashes` |

Unchanged: `bell`, `bookmark`, `calendar`, `check`, `clock`, `copy`, `info`,
`minus`, `sign-in`, `sign-out`, `star`, `user`, `warning-circle`.

The full map lives in `libs/al-web-components/icons/legacy-aliases.json`.
`<al-icon name="close">` also still resolves, because the alias map is consulted
when a name isn't a Phosphor icon.

> **One deliberate collision.** `<al-icon-list>` renders the legacy bulleted list
> (Phosphor `list-dashes`), but `<al-icon name="list">` renders the Phosphor
> hamburger. Name lookup checks the Phosphor catalog before the alias map, so a
> legacy name can never shadow a real Phosphor icon. Migrate `<al-icon-list>` to
> `<al-icon name="list-dashes">`.

### Icon webfont

The generated icon webfont is **removed**. The `.icon-<name>` utility classes and
the `iconfont` `@font-face` no longer exist; `dist/fonts/iconfont.css` ships as an
empty deprecation stub for one minor version so existing `@import`s don't 404.
At 1,512 glyphs the base64-inlined font would have been ~275–400 KB. Replace
`<span class="icon-close">` with `<al-icon name="x">`.

## 5. Tokens you may still rely on

Token names are **frozen at the 1.0 alias map**
(`libs/al-web-components/styles/dist-v5/aliases.json`). v2 ships the same
set; the alias map gates deprecation through the 3.0 compat budget.

If you're authoring against `--al-*` directly, no change. If you used
`var(--al-theme-color-background-default)` etc., those still resolve to
the same values in v2's default theme.

## 6. Storybook / dev tooling

- v2 ships **Vite 5** as the library + Storybook builder (webpack removed),
  **Storybook 10** with the `@storybook/web-components-vite` /
  `@storybook/react-vite` framework, **pnpm 9** workspaces, **Node 22 LTS**.
- Sass is on `@use` / `@forward` with the modern compiler API — zero
  deprecation warnings in the build pipeline.
- Existing `.storybook/preview.ts` keeps working; components render via
  the Vite library build only (the parallel webpack pipeline was retired
  end-of-Phase-2).

## 7. SSR

`@lit-labs/ssr` renders the v2 components with Declarative Shadow DOM.
See `.altitude/SSR.md` for the matrix.

## 8. CI checklists for consumers

- Replace `register({...})` with `registerAltitude({mode:'stable'}, ...)`.
- Wrap your app shell in `<al-theme>`.
- Update React (and `@lit/react`) to v19.
- Run the contract validator against your generated/templated HTML
  examples — see `scripts/validate-contracts.js` for the reference
  implementation.

## 9. What was removed

- `getGlobalStyles()` regex-strip path inside `ALElement` is gone (T4.3).
- The legacy SD v3 pipeline (`tokens-config.js`) and the `wca` (legacy
  manifest analyzer) are gone (T6.2). The v5 pipeline ships the same
  byte-identical `--al-*` output.

## 10. Layout consolidation — one arrangement primitive

v2 collapses every "where do boxes sit" concern onto a single component,
`<al-layout>`. Before, arrangement was spread across six layout components and
sixteen components carrying their own arrangement props under nine different
names (`orientation`, `gap`, `alignment`, `align`, `direction`, `behavior`,
`justify`, `verticalAlignment`, `mediaPosition`). "Row or column" alone was
spelled three ways.

### The new `<al-layout>`

```html
<al-layout
  variant="constrained|grid|bento"             <!-- omit for flow -->
  direction="row|column"                       <!-- default column -->
  gap="none|xs|sm|md|lg|xl"                    <!-- default 16px -->
  align="start|center|end|stretch"             <!-- cross axis -->
  justify="start|center|end|between"           <!-- main axis -->
  size="sm|md|lg|xl|xxl|full"                  <!-- constrained: the measure -->
  gutter="none|sm|md|lg"                       <!-- constrained: track width -->
  columns="1-12"                               <!-- grid: column count -->
  wrap grow stretchItems responsive fullHeight noCollapse>
```

Layout owns three orthogonal jobs, chosen by `variant`:

- **flow** (no variant) — stack or row content.
- **constrained** — the page measure. Children sit in a centred content column
  capped at `size`, with gutter tracks either side. **A child marked `bleed`
  breaks out and runs edge-to-edge.** This is the "constrained layout" pattern —
  the page declares its measure once and each child decides whether it lives
  inside it, so sections no longer each need their own container wrapper.
- **grid** — an N-column grid. Children span with the SAME
  `al-u-grid__item col:N` classes the `.al-u-grid` utility uses; there is only
  one span system in the design system.
- **bento** — a 12-column auto-row grid for `<al-bento-item>` children.

```html
<al-layout variant="constrained" size="xl">
  <al-hero bleed></al-hero>
  <al-heading tagName="h2">Features</al-heading>
</al-layout>
```

Two behaviours worth knowing:

- **`<al-layout>`'s host is `display: contents`.** Its layout box participates
  directly in a flex/grid parent, which is what makes it work when projected
  into a slot. Add **`grow`** when it needs to absorb the parent's free space —
  required for `justify` to have room to act on inside a `space-between`
  dialog or popover footer.
- **`min-height: 100vh` is now opt-in via `fullHeight`.** It used to be
  unconditional, which made `<al-layout>` unusable for anything smaller than a
  page. **Every page shell must add `fullHeight` or it will collapse to content
  height.**

### Removed components

| Removed | Replacement |
|---|---|
| `al-button-group` | `<al-layout direction="row">` |
| `al-layout-container` | `<al-layout variant="constrained">` |
| `al-layout-section` | a plain child of `<al-layout>` |
| `al-bento-grid` | `<al-layout variant="bento">` |
| `al-split-content` | `<al-layout direction="row" wrap>` + a theme class |
| `variant="sidebar-left\|sidebar-right"` | `<al-layout variant="grid">` + `--al-layout-template` |

```diff
- <al-button-group alignment="right">
+ <al-layout direction="row" justify="end" grow>
- <al-button-group alignment="center">
+ <al-layout direction="row" justify="center" grow>
- <al-button-group behavior="stacked">
+ <al-layout>
- <al-button-group behavior="stretched">
+ <al-layout direction="row" stretchItems>
- <al-button-group behavior="responsive">
+ <al-layout direction="row" responsive>

- <al-layout-container>
+ <al-layout variant="constrained" size="xl" gutter="sm">

- <al-bento-grid>
+ <al-layout variant="bento">
```

### The sidebar variants are gone

`sidebar-left` / `sidebar-right` hardcoded one ratio (40% / 1fr at `md`). A page
now declares its own track list through `--al-layout-template`, which inherits
through the shadow boundary into `variant="grid"`. Pair it with `noCollapse` so
the page owns the responsive story:

```diff
- <al-layout variant="sidebar-left" gap="none">
+ <al-layout variant="grid" gap="none" fullHeight noCollapse class="app-shell">
```

```css
.app-shell { --al-layout-template: 1fr; }

@media all and (min-width: 768px) {
  .app-shell {
    --al-layout-template: 320px minmax(0, 1fr);
  }
}
```

This is strictly more capable than the old variant — any track list works, not
just 40%/1fr — and it is how `al-split-content` was retired too: the two-column
media/content band is now theme CSS applied to an `<al-layout direction="row"
wrap>`, because the differing column flex-bases that make it stack intrinsically
are a page-design decision, not a design-system behaviour.

### Group components kept their semantics, lost their arrangement

These components still exist — they own real behaviour a layout box cannot
express — but their arrangement props are gone. Nest the slotted content in an
`<al-layout>` instead.

| Component | Still owns | Removed prop |
|---|---|---|
| `al-checkbox-group` | `<fieldset>`/`<legend>`, field note, required/disabled cascade | `variant="horizontal"` |
| `al-radio-group` | the above + arrow-key roving selection | `variant="horizontal"` |
| `al-toggle-button-group` | single-select state, click-outside deselect | `orientation`, `gap` |

`al-chip-group` and `al-toast-group` have been **removed** entirely. Replace
`<al-chip-group>` with `<al-layout direction="row" wrap>`; the "+N" overflow
counter has no replacement. `<al-toast-group>` has no replacement either —
position `<al-toast>` yourself. `al-toast`'s `onToastGroupOpen` event is
renamed `onToastOpen` now that no group exists to name.

```diff
- <al-radio-group label="Posted at" variant="horizontal">
-   <al-radio>Any time</al-radio>
-   <al-radio>Last 24 hours</al-radio>
- </al-radio-group>
+ <al-radio-group label="Posted at">
+   <al-layout direction="row" wrap gap="md">
+     <al-radio>Any time</al-radio>
+     <al-radio>Last 24 hours</al-radio>
+   </al-layout>
+ </al-radio-group>
```

### Renamed for one vocabulary

`al-list` and `al-time-selector-list` cannot delegate to `<al-layout>` — a
layout box between a `<ul>` and its `<li>` children would break list semantics —
so they keep their own arrangement but now use Layout's names.

```diff
- <al-list orientation="horizontal">
+ <al-list direction="row">

- <al-time-selector-list orientation="horizontal">
+ <al-time-selector-list direction="row">
```

(`al-split-content` is not part of this rename — it was removed entirely; see
the "Removed components" table above for its `<al-layout direction="row" wrap>`
replacement.)

Note: `orientation` on the internal menu controller is unchanged — there it
means keyboard navigation direction, not layout.

### The rule going forward

**If a wrapper would own no behaviour, no ARIA relationship, and no state, it
is not a component — it is `<al-layout>` with props.** Do not add a
`direction`/`gap`/`align`/`justify` prop to a new component, and do not
hand-roll flex or grid to arrange slotted children.

## Questions

Open a discussion on the repo, ping `@southleft` on Twitter, or email
`design-system@southleft.com`.
