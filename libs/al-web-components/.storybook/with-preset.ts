// The preset decorator. Specs: 2026-07-28-storybook-preset-toolbar-switcher,
// then 2026-07-28-scoped-token-emission-brand-wiring.
//
// This used to be a TWO-mechanism decorator: `brand` could only be delivered
// by swapping a whole `:root` stylesheet into `<head>`, because every bundle is
// emitted unlayered and `components/theme/theme.scss` had no `:host([brand])`
// rule. All four axes now travel as attributes on one `<al-theme>` element —
// the emitter writes `:host([brand])` / `:host([brand][mode])` blocks into the
// component's own styles (`styles/dist-v5/scss/host/`). The stylesheet swap,
// its always-last ordering guard and the `style#al-preset-tokens` element are
// gone.
//
// Consequences worth knowing:
//   * there is no global state left, so two stories on one docs page could
//     legitimately carry different presets;
//   * a preset now applies inside the wrapper only — nothing leaks to
//     `document.head`, so the Storybook chrome and any un-wrapped story are
//     untouched by construction rather than by careful id management.

import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import type { Decorator } from '@storybook/web-components';
import { ALTheme } from '../components/theme/theme';
import { getPreset, type Preset } from './presets';

// R5 / spec risk R-1, belt-and-braces half two. `.storybook/auto-registry.ts`
// is imported first from `preview.ts` so `alAutoRegistry` is already true by
// the time `../components/theme/theme` is evaluated above — but if someone
// reorders those imports, `theme.ts:58-60` silently declines to register and
// every axis dies without an error. Define it here unconditionally so the
// decorator cannot render an un-upgraded wrapper.
if (customElements.get(ALTheme.el) === undefined) {
  customElements.define(ALTheme.el, ALTheme);
}

/** `parameters.alPreset = { disable: true }` opts a story out entirely. */
function isDisabled(context: { parameters?: { alPreset?: { disable?: boolean } } }): boolean {
  return context.parameters?.alPreset?.disable === true;
}

export const withPreset: Decorator = (story, context) => {
  // Opt-out. Used by the `<al-theme-switcher>` stories: that component walks up
  // for an `<al-theme>` ancestor (`theme-switcher.ts:109-113`) and takes the
  // scoped path when it finds one, so inside a wrapper its own global-swap
  // fallback is unreachable and only `mode` and `brand` attributes move.
  if (isDisabled(context)) return story();

  const preset: Preset = getPreset(context.globals?.alPreset);

  // `density` / `contrast` / `shape` / `motion` are still written only when
  // the preset names them — not because `comfortable` is dangerous any more
  // (that rule is gone), but because e.g. `contrast="normal"` / `shape="default"`
  // / `motion="full"` match no rule and an absent attribute is the honest
  // expression of "this preset does not take a position".
  return html`<al-theme
    brand=${preset.brand}
    mode=${preset.mode}
    density=${ifDefined(preset.density)}
    contrast=${ifDefined(preset.contrast)}
    shape=${ifDefined(preset.shape)}
    motion=${ifDefined(preset.motion)}
    data-al-preset=${preset.id}
    >${story()}</al-theme
  >`;
};
