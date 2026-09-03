# @southleft/al-react

The React powered design system for web applications.

React 19 wrappers (`@lit/react` `createComponent`) around the Lit components in
`@southleft/al-web-components`. Registration is **versioned** — `suffix:
PackageJson.version` — so the tags in the DOM are `al-button-1-0-0`,
`al-theme-1-0-0`, and so on.

## Prerequisite

`@southleft/al-web-components` must be built first — every wrapper imports from
its `dist/`, and the tests resolve the library through the exports map.

```sh
pnpm --filter @southleft/al-web-components build
pnpm --filter @southleft/al-react start          # vitest, the `react` project
```

Note `start` here runs **tests**, not a dev server. This package's Storybook was
retired on 2026-08-25 along with the web-components one, and the `.storybook/`
directory and every `*.stories.tsx` went with it — there are no story files in
`src/` today. Consume the wrappers from `apps/react` (`pnpm --filter al-app-react
start`) or read the documented components at `apps/docs`.

## Theming

`<ALTheme>` is the theming host. It sets tokens on `:host`, so anything it
should theme must be inside it, and two subtrees can carry different brands on
one page.

```tsx
import { ALTheme, ALButton } from '@southleft/al-react';

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

## Theme presets

The **Preset** toolbar dropdown, the `parameters.alPreset` story opt-out, and
the `test:preset-parity` script were all Storybook surfaces and are **gone**
(retired 2026-08-25 — both the checker script and the root `pnpm run` alias that
wrapped it were deleted). No successor toolbar was built — set the axes on
`<ALTheme>` directly, per the table above.

The preset *data* survived, at `libs/al-web-components/theme-presets.ts`
(`PRESETS`, `SOUTHLEFT_PRESETS`, `ALL_PRESETS`, `DEFAULT_PRESET_ID`), because two
things outside Storybook read it: the story fixture takes the brand and mode the
accessibility sweep renders under, and `apps/home/scripts/generate-stats.js`
counts `PRESETS` for the "recipes shipped" figure. Its own header explains why it
was not deleted with the rest.

## Generating a wrapper

```sh
pnpm --filter @southleft/al-react plop        # `component` generator, PascalCase name
```

It writes `src/components/<Name>/{<Name>.tsx,index.tsx,<Name>.stories.tsx}` and
appends the barrel export.

**The generated `.stories.tsx` has nothing to run it.** The plop template
(`plop/templates/component/Component.stories.tsx.hbs`) still imports `StoryObj`
from `@storybook/react-vite`, which is no longer a dependency of this package —
it predates the 2026-08-25 retirement and no `*.stories.tsx` remains in `src/`.
Delete the generated story file, or leave it knowing nothing renders or
type-checks it (story files are excluded from `tsconfig.json`).
