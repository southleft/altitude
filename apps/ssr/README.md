# `apps/ssr/` — SSR reference fixture (T5.2)

The reference fixture for **T5.2 — SSR**. `scripts/build.mjs` server-renders
each pilot component with `@lit-labs/ssr`, emitting one HTML page per pilot
under `dist/` plus a client hydration entry that loads the component
definitions so the browser upgrades the elements without remeasuring the DOM.
See `.altitude/SSR.md` for the browser matrix and the four-step DSD hydration
sequence.

Declarative Shadow DOM is **opt-in per pilot** (`ssr: true` in the `PILOTS`
array). Today only `al-theme` opts in: the other five pilots throw
`this.querySelector is not a function` under lit-ssr's DOM shim, because
`ALElement.slotEmpty()` calls it during render — see the write-up in
`scripts/build.mjs`. Making `slotEmpty` SSR-safe is the prerequisite for
expanding DSD coverage, and is deliberately not this fixture's job.

## Run locally

```bash
pnpm --filter al-app-ssr build     # writes ./dist/*.html
pnpm --filter al-app-ssr start     # http://localhost:5177
```

## What each page shows

- Five pilots (`al-button`, `al-input`, `al-select`, `al-dialog`,
  `al-theme-switcher`) render as plain elements that hydrate on load.
- `al-theme` renders with real DSD: `brand="southleft" mode="dark"` serializes
  the scoped `:host([brand])` token block, so its probe paragraph is branded
  even with JavaScript disabled.
