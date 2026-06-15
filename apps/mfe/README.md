# `apps/mfe/` — Micro-frontend coexistence fixture (T0.3 + T4.6)

Acceptance fixture for **T4.6 — Registry modes**. Two `<section>` elements
register the same component class under distinct suffixed custom-element
tags using `registerAltitude({mode: 'versioned', suffix})`. Each side
renders the suffixed tag; the Playwright test (`tests/mfe.spec.ts`)
asserts the two tags resolve to distinct `customElements` entries — proving
subtree isolation works for multi-version MFE deployments.

When a real second copy of `al-web-components` is published, swap the
shared import with two version-pinned packages; the rest of this wiring
stays identical.

## Run locally

```bash
yarn workspace al-web-components build
yarn workspace al-app-mfe start    # Vite dev server on :5175
yarn workspace al-app-mfe build
yarn test:vrt --grep mfe           # Playwright versioned-registration test
```

## How the API is used

```js
import { registerAltitude } from 'al-web-components/dist/directives/register.js';
import { ALButton } from 'al-web-components/dist/components/button/button.js';

const map = registerAltitude({ mode: 'versioned', suffix: '1-0-0' }, [
  [ALButton.el, ALButton],
]);
const tag = map.get(ALButton.el); // 'al-button-1-0-0'
```

The element list is `[tagName, ClassReference]` tuples (same shape as the
legacy `register()`). The factory returns a `Map<originalName, registeredName>`
so the consumer can rebind templated tag names. Use the returned alias
inside templates (`<${tag}>…</${tag}>`).

## What changed at T4.6

Before: the fixture statically imported `button.js` and relied on
`window.alAutoRegistry = true` for the side-effect registration. That's
single-version-only.

After: the fixture imports the class explicitly and calls
`registerAltitude({mode: 'versioned'})` for each subtree. Each side
gets its own tag namespace, and a Playwright assertion confirms the
two registrations don't collide.
