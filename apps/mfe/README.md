# `apps/mfe/` — Micro-frontend coexistence fixture (T0.3)

Acceptance fixture for **T4.6 — Registry modes**. Two `<section>` elements
simulate two Altitude consumers on the same page. Today, both register the
same tag; T4.6 turns this fixture into a green acceptance test by exposing
the `versioned` registry mode and isolating each subtree.

## Run locally

```bash
yarn workspace al-web-components build
yarn workspace al-app-mfe start    # Vite dev server on :5175
yarn workspace al-app-mfe build
```

## What changes at T4.6

The fixture's `src/main.js` will switch from the static module imports to:

```js
import { registerAltitude } from 'al-web-components';
registerAltitude({ mode: 'versioned', suffix: '1-0-0' }, document.querySelector('[data-app="left"]'));
registerAltitude({ mode: 'versioned', suffix: '2-0-0' }, document.querySelector('[data-app="right"]'));
```

And a Playwright test will assert the two sides resolve to **distinct**
`customElements` entries.
