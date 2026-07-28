# Altitude 1.x → 2.x migration guide

Altitude v2 changes the theming model from a single global `<style>`
mutation to a scoped `<al-theme>` host. Most consumers can migrate in
two edits + a `pnpm upgrade`.

## TL;DR

```diff
- import { register } from 'al-web-components';
+ import { registerAltitude } from 'al-web-components';
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
<al-theme brand="northright" mode="light">
  <al-button>Brand A</al-button>
</al-theme>
<al-theme brand="odyssey" mode="dark">
  <al-button>Brand B</al-button>
</al-theme>
```

The two buttons compute distinct `--al-*` values without touching `:root`.

### Legacy fallback

`<al-theme-switcher>` keeps its v1 behavior when called outside an
`<al-theme>` ancestor. To opt out of the legacy path:

```js
document.querySelector('al-theme-switcher').scopedOnly = true;
```

Plan to call this out in your release checklist before deprecation
budget 3.0.0.

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

## 3. Upgrade React (if consuming `al-react`)

```diff
- "react": "18.2.0",
- "react-dom": "18.2.0",
+ "react": "^19",
+ "react-dom": "^19",
```

al-react's `@lit/react`-backed wrappers handle the rest. R19 + custom
elements still requires the explicit `events` map on each wrapper for
listeners to bind — every shipped wrapper already declares this.

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
import { caretDown } from 'al-web-components/dist/components/icon/glyphs.js';
import { registerIcons } from 'al-web-components/dist/components/icon/registry.js';
registerIcons({ 'caret-down': caretDown });
```
```html
<al-icon name="caret-down" size="sm"></al-icon>
```

If icon names come from data you don't control, opt into the loader once —
~13 KB gzipped plus a request per icon, and it cannot render server-side:

```ts
import 'al-web-components/dist/components/icon/lazy.js';
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

## Questions

Open a discussion on the repo, ping `@southleft` on Twitter, or email
`design-system@southleft.com`.
