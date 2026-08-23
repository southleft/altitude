// Preview config for the Southleft Storybook.
//
// Reuses `../.storybook/preview.ts` wholesale rather than restating it: that
// module's SIDE EFFECTS are the boot sequence (the `alAutoRegistry` flag must
// be set before any component module evaluates, the custom-elements manifest
// must be registered for docgen, and `main.scss` must be injected as
// `style#al-theme-sheet`), and its `parameters` carry the story sort, the
// controls exclusions and the custom autodocs page. Importing it runs all of
// that; spreading it keeps the docs identical between the two Storybooks.
//
// What differs:
//   * the preset the stories render in. `withPreset` reads `globals.alPreset`
//     and stamps `<al-theme brand mode>` around every story, so seeding that
//     global with `southleft-dark` is the whole "make Southleft the rendered
//     default" change — no second decorator, no forked story files;
//   * the scoped component catalog, plus the Southleft brand layer
//     (`libs/sl-web-components`) filed under the same tiers.

import basePreview from '../.storybook/preview';
import type { Preview } from '@storybook/web-components';
import { SOUTHLEFT_DEFAULT_PRESET_ID } from '../.storybook/presets';

// Which parity report the `<FigmaParity>` docs block fetches. Both Storybooks
// serve the same `../dist` staticDir, so the two projects' reports are told
// apart by filename; `blocks/figma-parity.tsx` reads this global at FETCH time
// (first docs page mount), which is long after this module has evaluated, so
// the ESM import-order trap that governs `auto-registry` does not apply here.
// The manager side gets the same value as an argument (`./manager.js`).
(globalThis as { __AL_PARITY_URL__?: string }).__AL_PARITY_URL__ = './parity.southleft.json';

const baseParameters = basePreview.parameters ?? {};
const baseOptions = (baseParameters as { options?: { storySort?: Record<string, unknown> } }).options ?? {};

const preview: Preview = {
  ...basePreview,

  globalTypes: {
    ...basePreview.globalTypes,
    alPreset: {
      name: 'Mode',
      description: 'Southleft light / dark',
    },
  },

  // The `withSouthleftApp` decorator is GONE along with the Patterns tier. It
  // existed to attach `apps/southleft/src/styles/layout.css` while a pattern
  // story was on screen; every brand component now carries its own SCSS and
  // resolves the four `--sl-*` primitives through fallbacks in
  // `sl-web-components/styles/_brand.scss`, so nothing here depends on the
  // app's stylesheet any more. That was the stated finish line for the
  // migration (spec R11) and this is it.
  decorators: [...(basePreview.decorators ?? [])],

  // The rendered default. Dark matches southleft.com's own canvas (the warm
  // `ink` neutral). As in the Altitude config there is deliberately no
  // `toolbar` key — the toggle is a manager tool (`./manager.js`), and
  // declaring a toolbar here would make core render a competing dropdown.
  initialGlobals: {
    ...basePreview.initialGlobals,
    alPreset: SOUTHLEFT_DEFAULT_PRESET_ID,
  },

  parameters: {
    ...baseParameters,
    options: {
      ...baseOptions,
      storySort: {
        ...(baseOptions.storySort ?? {}),
        // The brand layer does NOT get a section of its own. A Southleft
        // component files under the tier it belongs to and supersedes the
        // Altitude entry for the same slot (see `SUPERSEDED_BY_BRAND` in
        // main.ts), so this sidebar reads as ONE design system — Southleft's,
        // with the Altitude catalog underneath — rather than two catalogues a
        // reader has to cross-reference to find which one the site ships.
        //
        order: [
          'Resources',
          'Foundations',
          'Atoms',
          ['*', 'Form', 'Navigation', 'Text'],
          'Molecules',
          ['*', 'Form', 'Navigation'],
          'Organisms',
        ],
      },
    },
  },
};

export default preview;
