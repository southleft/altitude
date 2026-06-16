# `apps/web-components/` — Lit consumer fixture (T0.3)

Minimal Vite-based static page that imports the 5 pilot components from
`al-web-components`. Functions as an acceptance test for every refactor
phase — if a change breaks a native consumer's ES module entry points,
this fixture won't build.

## Run locally

```bash
pnpm --filter al-web-components build         # produce the dist this app imports
pnpm --filter al-app-web-components start     # Vite dev server on :5173
pnpm --filter al-app-web-components build     # production build into ./dist
```

## What this fixture covers

| Pilot | Verified surface |
|---|---|
| `button` | tag registers, variants render, slot content shows |
| `input` | label + placeholder + required propagate |
| `select` | tag registers (popover wiring exercised at T4.x) |
| `dialog` | open/close behavior via JS API |
| `theme-switcher` | tag registers (legacy global swap or scoped host depending on phase) |
