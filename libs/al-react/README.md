# al-react

The React powered design system for web applications.

React 19 wrappers (`@lit/react` `createComponent`) around the Lit components in
`al-web-components`. Registration is **versioned** — `suffix:
PackageJson.version` — so the tags in the DOM are `al-button-1-0-0`,
`al-theme-1-0-0`, and so on.

## Prerequisite

`al-web-components` must be built first. Every wrapper imports from its
`dist/`, and the Storybook preview injects `dist/css/main.css`.

```sh
pnpm --filter al-web-components build
pnpm --filter al-react start          # Storybook on 9009
```

`.storybook/main.ts` checks for that build and fails with the command above if
it is missing.

## Theming

`<ALTheme>` is the theming host. It sets tokens on `:host`, so anything it
should theme must be inside it, and two subtrees can carry different brands on
one page.

```tsx
import { ALTheme, ALButton } from 'al-react';

<ALTheme brand="southleft" mode="dark" contrast="more">
  <ALButton>Label</ALButton>
</ALTheme>;
```

| prop | values | notes |
|---|---|---|
| `brand` | `altitude` `southleft` | southleft builds **dark only** |
| `mode` | `light` `dark` | |
| `density` | `compact` `cozy` `comfortable` | optional; `comfortable` is the base ramp |
| `contrast` | `normal` `more` | optional; `normal` matches no rule |
| `motion` | `full` `reduced` | absent = follow `prefers-reduced-motion` |

Pass only the axes you mean — an omitted axis leaves the attribute off, which
is how you say "no position on this axis".

`<ALTheme>` is the one wrapper that is not a bare `createComponent` call. It
mirrors the five axes to **attributes**, because `@lit/react` sets reactive
properties and the rules carrying the tokens are attribute selectors
(`:host([brand='southleft'])`). Without the mirror the props are accepted and
nothing re-themes. The reasoning is in `src/components/Theme/Theme.tsx`.

`<al-theme-switcher>` finds its host with `closest('al-theme')`, which cannot
match the versioned `al-theme-1-0-0` tag — set axes on `<ALTheme>` instead.

## Storybook preset switcher

The **Preset** toolbar dropdown snaps brand + mode + density + contrast
together, and a global decorator wraps every story in `<ALTheme>`. The preset
list is imported from `al-web-components/.storybook/presets.ts` — the same
module the web-components Storybook reads, so the two cannot drift. Adding a
preset there makes it appear in both.

`parameters.alPreset = { disable: true }` opts a story out of the wrapper (the
`Theme` and `ThemeSwitcher` stories do, since they control the axes
themselves).

From the repo root, `pnpm test:preset-parity` drives both running Storybooks
through every preset and fails if the toolbars, the host attributes or the
computed brand tokens diverge.

## Generating a wrapper

```sh
pnpm --filter al-react plop        # `component` generator, PascalCase name
```

It writes `src/components/<Name>/{<Name>.tsx,index.tsx,<Name>.stories.tsx}` and
appends the barrel export. The generated story imports `StoryObj` from
`@storybook/react-vite`, matching the framework in `.storybook/main.ts` — no
post-generation edit is needed.

`@storybook/react-webpack5` appears nowhere in this package. It was never a
declared dependency and was never installed; the 66 files that imported types
from it type-checked only because story files are excluded from `tsconfig.json`
and the specifier was erased before resolution.
