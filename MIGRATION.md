# Altitude 1.x → 2.x migration guide

Altitude v2 changes the theming model from a single global `<style>`
mutation to a scoped `<al-theme>` host. Most consumers can migrate in
two edits + a `yarn upgrade`.

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

## 5. Tokens you may still rely on

Token names are **frozen at the 1.0 alias map**
(`libs/al-web-components/styles/dist-v5/aliases.json`). v2 ships the same
set; the alias map gates deprecation through the 3.0 compat budget.

If you're authoring against `--al-*` directly, no change. If you used
`var(--al-theme-color-background-default)` etc., those still resolve to
the same values in v2's default theme.

## 6. Storybook / dev tooling

- v2 ships Vite + Storybook tracking ahead (Storybook 10 staged through
  the workspace). Existing `.storybook/preview.ts` keeps working;
  components render under both webpack and Vite library builds.

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
