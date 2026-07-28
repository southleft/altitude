// The al-react preset decorator. Spec: 2026-07-28-react-storybook-preset-switcher.
//
// The React counterpart of `al-web-components/.storybook/with-preset.ts`. Both
// read the SAME `presets.ts` (imported below by relative path — al-react
// already reaches sideways into al-web-components that way for `main.css` and
// the icon font), so preset ids, labels and axis tuples cannot drift between
// the two Storybooks.
//
// Why the two decorators are not line-for-line identical:
//
//   * lit-html's `brand=${…}` writes an ATTRIBUTE. `@lit/react`'s
//     `createComponent` writes a PROPERTY for every key that is `in
//     elementClass.prototype` (`create-component.js` -> `setProperty`), and
//     `<al-theme>`'s five axes are `@property accessor`s with no `reflect`, so
//     a React prop alone never produces the attribute that
//     `:host([brand='odyssey'])` selects on. `ALTheme` (the wrapper) closes
//     that gap — see `src/components/Theme/Theme.tsx`.
//
//   * al-react registers with `suffix: PackageJson.version`, so the tag here is
//     `al-theme-1-0-0`, not `al-theme`. Nothing in this path calls
//     `closest('al-theme')` (R6): the axes are set on the element this
//     decorator renders, so the hardcoded tag name in
//     `theme-switcher.ts:109` is never consulted.
//
// There is no stylesheet swap and no `document.head` mutation on either side —
// `2026-07-28-scoped-token-emission-brand-wiring` moved `brand` into
// `<al-theme>`'s own compiled `:host([brand])` styles, which travel with
// `dist/components/theme/theme.js` and therefore with the wrapper.

import React from 'react';
import type { Decorator } from '@storybook/react-vite';
import { ALTheme } from '../src/components/Theme';
import { getPreset, type Preset } from '../../al-web-components/.storybook/presets';

/** `parameters.alPreset = { disable: true }` opts a story out entirely. */
function isDisabled(context: { parameters?: { alPreset?: { disable?: boolean } } }): boolean {
  return context.parameters?.alPreset?.disable === true;
}

export const withPreset: Decorator = (Story, context) => {
  // Opt-out, mirroring the web-components side. `<al-theme-switcher>` walks up
  // for a theme host and takes the scoped path when it finds one, so inside a
  // wrapper its own stories demonstrate only half of what they document.
  if (isDisabled(context)) return <Story />;

  const preset: Preset = getPreset(context.globals?.alPreset);

  // `density` / `contrast` stay OPTIONAL in the preset tuple and are written
  // only when a preset names them — copied verbatim from the web-components
  // decorator. `contrast="normal"` matches no rule, and an absent attribute is
  // the honest expression of "this preset takes no position on this axis".
  return (
    <ALTheme
      brand={preset.brand}
      mode={preset.mode}
      density={preset.density}
      contrast={preset.contrast}
      data-al-preset={preset.id}
    >
      <Story />
    </ALTheme>
  );
};
