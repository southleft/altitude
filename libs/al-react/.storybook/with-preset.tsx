// The @southleft/al-react preset decorator. Spec: 2026-07-28-react-storybook-preset-switcher.
//
// The React counterpart of `@southleft/al-web-components/.storybook/with-preset.ts`. Both
// read the SAME `presets.ts` (imported below by relative path — @southleft/al-react
// already reaches sideways into @southleft/al-web-components that way for `main.css` and
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
//     `:host([brand='southleft'])` selects on. `ALTheme` (the wrapper) closes
//     that gap — see `src/components/Theme/Theme.tsx`.
//
//   * @southleft/al-react registers with `suffix: PackageJson.version`, so the tag here is
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

/**
 * Repaint the preview iframe's own surface to match the active preset —
 * ported from `@southleft/al-web-components/.storybook/with-preset.ts` (see that file
 * for why neither a painted wrapper `<div>` nor a `:root` stylesheet swap is
 * acceptable). `<al-theme>` is `display: contents`, so it paints nothing; the
 * iframe background comes from the altitude-DARK `:root` bundle and does not
 * move when the one-click toggle flips to light.
 *
 * One deliberate difference: the selector is `[data-al-preset]` alone, not
 * `al-theme[data-al-preset]` — @southleft/al-react registers with a version suffix, so
 * the element here is `al-theme-1-0-0` and a tag-qualified selector would
 * never match.
 */
const SURFACE_TOKENS = [
  '--al-theme-color-background-default-weak',
  '--al-theme-color-content-default',
] as const;

function syncPreviewSurface(): void {
  requestAnimationFrame(() => {
    const el = document.querySelector('[data-al-preset]');
    if (!el) return;
    const cs = getComputedStyle(el);
    for (const token of SURFACE_TOKENS) {
      const value = cs.getPropertyValue(token).trim();
      if (value) document.documentElement.style.setProperty(token, value);
    }
  });
}

export const withPreset: Decorator = (Story, context) => {
  // Opt-out, mirroring the web-components side. `<al-theme-switcher>` walks up
  // for a theme host and takes the scoped path when it finds one, so inside a
  // wrapper its own stories demonstrate only half of what they document.
  if (isDisabled(context)) return <Story />;

  const preset: Preset = getPreset(context.globals?.alPreset);
  syncPreviewSurface();

  // `density` / `contrast` / `shape` / `motion` stay OPTIONAL in the preset
  // tuple and are written only when a preset names them — copied verbatim
  // from the web-components decorator. `contrast="normal"` / `shape="default"`
  // / `motion="full"` match no rule, and an absent attribute is the honest
  // expression of "this preset takes no position on this axis".
  return (
    <ALTheme
      brand={preset.brand}
      mode={preset.mode}
      density={preset.density}
      contrast={preset.contrast}
      shape={preset.shape}
      motion={preset.motion}
      data-al-preset={preset.id}
    >
      <Story />
    </ALTheme>
  );
};
