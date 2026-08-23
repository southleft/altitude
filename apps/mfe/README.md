# `apps/mfe/` — Micro-frontend coexistence fixture (T0.3 + T4.6)

Acceptance fixture for **T4.6 — Registry modes**. Two `<al-card>` panels
register the same component classes (`al-button`, `al-card`, `al-heading`)
under distinct suffixed custom-element tags using
`registerAltitude({mode: 'versioned', suffix})`. Each side renders its
suffixed tags; the Playwright test (`tests/mfe.spec.ts`) asserts the two
button tags resolve to distinct `customElements` entries — proving subtree
isolation works for multi-version MFE deployments.

The page chrome (`<al-theme>`, the outer `<al-layout>`, the header
`<al-heading>`) belongs to neither simulated app, so it gets its own
versioned registration under a `shell` suffix — see `src/main.js`. There is
no `window.alAutoRegistry` anywhere in this fixture: every Altitude tag on
the page is a suffixed alias produced by `registerAltitude`.

When a real second copy of `al-web-components` is published, swap the
shared import with two version-pinned packages; the rest of this wiring
stays identical.

## Run locally

```bash
pnpm --filter al-web-components build
pnpm --filter al-app-mfe start    # Vite dev server on :5175
pnpm --filter al-app-mfe build
pnpm test:vrt --grep mfe           # Playwright versioned-registration test
```

## How the API is used

```js
import { registerAltitude } from 'al-web-components/directives/register';
import { ALButton } from 'al-web-components/components/button';

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
