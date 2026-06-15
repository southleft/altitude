# `apps/ssr/` — SSR placeholder fixture (T0.3)

Acceptance fixture for **T5.2 — SSR**. Today it emits trivial static HTML
pages so CI can verify the fixture exists and builds; at T5.2 this turns
into a real Lit SSR renderer with Declarative Shadow DOM.

## Run locally

```bash
yarn workspace al-app-ssr build     # writes ./dist/*.html
yarn workspace al-app-ssr start     # http://localhost:5177
```

## What changes at T5.2

`scripts/build.mjs` will:

1. Import the pilot components.
2. Use `@lit-labs/ssr` to render each into a string with DSD.
3. Serve the result and let the browser hydrate without FOUC.

A Playwright test asserts hydration happens without a flash and that
interactive behavior works after hydration.
