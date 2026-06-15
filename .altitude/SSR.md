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
   string is inlined by webpack/Vite before SSR; the resulting
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
yarn workspace al-app-ssr build       # writes dist/al-*.html
yarn test:vrt --grep ssr              # Playwright hydration assertion
```
