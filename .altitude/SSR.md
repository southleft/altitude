# SSR + Declarative Shadow DOM matrix (T5.2)

Altitude components are server-renderable via `@lit-labs/ssr`. The fixture
at `apps/ssr/` proves the shape end-to-end.

## Browser / framework matrix

| Surface | DSD baseline | Polyfill required | Fixture coverage |
|---|---|---|---|
| Chrome 90+ | ✅ native | none | `apps/ssr/dist/al-*.html` |
| Edge 90+ | ✅ native | none | as above |
| Safari 16.4+ | ✅ native | none | as above |
| Firefox 123+ | ✅ native | none | as above |
| Older browsers (Firefox <123, Safari <16.4) | ⚠ partial | `@webcomponents/template-shadowroot` polyfill at the page head | not currently exercised |
| Node-side SSR | ✅ via `@lit-labs/ssr` | dom-shim auto-loaded | `apps/ssr/scripts/build.mjs` |

The fallback path injects the shadowroot-polyfill `<script>` block just
before `</head>` when the user-agent does not match the baseline matrix.
That polyfill is a one-time ~3KB include and is the only Phase-5 weight
added to legacy environments.

## Component constraints

For a component to render with Lit SSR:

1. `static styles` must not call `unsafeCSS` over an unbundled string at
   class-evaluation time — the dom-shim doesn't expose `CSSStyleSheet`.
   Our pattern (`unsafeCSS(styles.toString())`) works because the source
   string is inlined by Vite (via `?inline`) before SSR; the resulting
   `CSSResult` is shim-safe.
2. `connectedCallback()` must not access `document` synchronously. Our
   `ALElement.connectedCallback` adopts a stylesheet via
   `shadowRoot.adoptedStyleSheets` — the dom-shim provides a stub so the
   SSR pass completes.
3. Components with mandatory browser globals (clipboard, file picker)
   should render a *static* fallback in SSR and hydrate the interactive
   behavior on the client. None of the 5 pilots fall in this category.

## Hydration sequence

1. Browser parses the SSR'd HTML — the `<template shadowrootmode="open">`
   is attached to its host without JS.
2. Inline `<script>` sets `window.alAutoRegistry = true`.
3. Module script imports the per-component definition. As soon as
   `customElements.define` is called, the host element upgrades, keeping
   the existing shadow root content. Lit's hydration pass binds reactive
   property values to the already-painted DOM without re-rendering.
4. Test fixture flips `data-hydration` from `pending` → `complete` once
   the import resolves.

## Scoped theming under DSD (`2026-07-28-scoped-token-emission-brand-wiring`)

**Decision: eager. `<al-theme>` carries every scoped brand/mode block in
`static styles`, so `@lit-labs/ssr` serializes all of them into each host's DSD
template. Measured cost: 19,641 bytes per `<al-theme>` element**, with no
cross-instance dedup. In practice that is once per page — every app fixture
uses `<al-theme>` as a single root wrapper.

The alternative — serializing only the *active* brand×mode block — was
considered and rejected: `static styles` is a property of the CLASS, not the
instance, so "only the active block" means either a distinct subclass per
brand×mode (a public API of 12 classes to save 16 KB) or a runtime
`adoptedStyleSheets` push, which by definition is not serialized and would mean
**no** brand theming without JavaScript. Eager is the only option that renders
branded with JS disabled, and 19 KB of custom-property text gzips to ~1.5 KB.

Verified 2026-07-28 on `apps/ssr/dist/al-theme.html`, Chromium with
`javaScriptEnabled: false` (the pilot used `brand="odyssey"` at the time; spec
2026-08-20-brand-pruning-and-storybook-de-bloat cut odyssey and repointed the
pilot at `brand="southleft"` — mechanism unchanged, only the brand under test):

| | value |
|---|---|
| `<al-theme>` has a shadow root | `true` (from the DSD template, no JS) |
| `customElements.get('al-theme')` | `undefined` — nothing upgraded |
| probe `font` (southleft) | `16px/20px ui-monospace, …` — southleft's mono type ramp (`--al-typography-preset-16`, `tokens-southleft-dark.css`) |
| probe `color` (southleft) | `#f05735` — southleft's red accent (`--al-theme-color-background-primary-default`) |

Two things this exposed, both fixed in the same change:

- **The pilot had never actually server-rendered.** Nothing in
  `apps/ssr/scripts/build.mjs` imported a component definition, and lit-ssr can
  only serialize a class it knows, so every pilot page emitted a bare unknown
  element with no template at all. Registration is now opt-in per pilot
  (`ssr: true`) and only `al-theme` opts in — see the note in that file about
  `ALElement.slotEmpty()` throwing under the DOM shim, which makes the other
  five strictly worse if registered.
- **The pages' `main.css` link was one directory short** and had always 404'd.
  That matters now: the scoped blocks are **deltas** over the base `:root`
  bundle, so without it a brand's literal values (type ramp, radii) still apply
  while every `var(--al-color-*)` reference dangles. Odyssey rendered Georgia
  18/32 in black. **`<al-theme>` composes on top of a base token sheet; it does
  not replace one.**

## Known fallbacks

- The current SSR build script emits a DSD wrapper around each pilot
  even when `@lit-labs/ssr` cannot fully evaluate a component class
  (e.g. when a transitive import touches a browser-only API at
  module-load time). The wrapper is `<al-foo><template shadowrootmode="open">
  <!-- SSR fallback --></template>…</al-foo>` — the host element still
  hydrates on the client.
- This is documented as the **Phase-5 baseline**. Phase 6 hardens it by
  routing module-load globals through a dom-shim guard at codegen time.

## Test

```bash
pnpm --filter al-app-ssr build       # writes dist/al-*.html
pnpm test:vrt --grep ssr              # Playwright hydration assertion
```
