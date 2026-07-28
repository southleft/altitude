// The preset decorator. Spec: 2026-07-28-storybook-preset-toolbar-switcher.
//
// Applies the toolbar's `globals.alPreset` to the canvas with BOTH halves of
// the mechanism, because the four axes are delivered by two different and
// non-interchangeable means in the code as it stands:
//
//   brand              -> ONLY a global `:root` block. Every bundle is emitted
//                         unlayered `:root` (`styles/tokens-config.v5.mjs:148`)
//                         and `components/theme/theme.scss` has NO
//                         `:host([brand])` rule, so the attribute alone styles
//                         nothing. => stylesheet swap.
//   density, contrast  -> ONLY host rules (`theme.scss:20-34`, `:37-39`). No
//                         bundle varies by either. => attribute on <al-theme>.
//   mode               -> both, and mostly the bundle: the host rule carries
//                         two custom properties (`theme.scss:10-17`), the
//                         per-mode bundle carries the whole surface.
//
// When `2026-07-28-scoped-token-emission-brand-wiring` adds `:host([brand])`
// rules, `brand` moves from the swap to the wrapper by DELETING `applyTokens`
// — the toolbar, the preset ids and `presets.ts` do not change.

import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import type { Decorator } from '@storybook/web-components';
import { ALTheme } from '../components/theme/theme';
import { getPreset, presetTokens, type Preset } from './presets';

// R5 / spec risk R-1, belt-and-braces half two. `.storybook/auto-registry.ts`
// is imported first from `preview.ts` so `alAutoRegistry` is already true by
// the time `../components/theme/theme` is evaluated above — but if someone
// reorders those imports, `theme.ts:58-60` silently declines to register and
// every host-rule axis dies without an error. Define it here unconditionally
// so the decorator cannot render an un-upgraded wrapper.
if (customElements.get(ALTheme.el) === undefined) {
  customElements.define(ALTheme.el, ALTheme);
}

/**
 * STYLESHEET OWNERSHIP CONTRACT (R4). Also documented for humans in
 * `.storybook/docs/THEMING.mdx`.
 *
 * | element                  | owner              | rule                                   |
 * |--------------------------|--------------------|----------------------------------------|
 * | `style#al-theme-sheet`   | `preview.ts:20-24` | base `main.scss` + the altitude-dark   |
 * |                          |                    | `:root` block. NEVER touched here.     |
 * | `style#iconfont-style`   | `preview.ts:26-30` | NEVER touched here.                    |
 * | `style#al-preset-tokens` | THIS MODULE        | exactly one; after every other sheet.  |
 * | `style#al-tokens-sheet`  | `<al-theme-switcher>` | distinct id; resolved by opt-out.   |
 *
 * `style#al-theme-sheet` and `style#al-preset-tokens` are unlayered `:root`
 * rules of identical specificity, so DOCUMENT ORDER decides and last wins.
 * That is the entire reason this re-appends rather than mutates in place.
 */
const PRESET_STYLE_ID = 'al-preset-tokens';

/**
 * "Last" means last among elements that can carry CSS, not
 * `head.lastElementChild`. The static `build:storybook` output appends
 * `<link rel="modulepreload">` tags for the lazy story chunks after our block
 * (verified: indices 25-26 vs our 24), and those carry no rules — treating
 * them as competition would make this re-append on every single render, which
 * on a 29-story docs page is 29 needless style recalcs.
 */
function isAfterAllStylesheets(el: Element): boolean {
  for (let n = el.nextElementSibling; n; n = n.nextElementSibling) {
    if (n.tagName === 'STYLE') return false;
    if (n.tagName === 'LINK' && (n.getAttribute('rel') || '').includes('stylesheet')) return false;
  }
  return true;
}

/**
 * @param css raw `:root { … }` text, or `null` to remove the block entirely
 *            (the opt-out path — a stale block from the previously viewed
 *            story must not leak into a story that opted out).
 */
function applyTokens(css: string | null): void {
  const head = document.head;
  const existing = head.querySelector<HTMLStyleElement>(`style#${PRESET_STYLE_ID}`);

  if (css === null) {
    existing?.remove();
    return;
  }

  // Already correct AND still after every other stylesheet — nothing to do.
  if (existing && existing.textContent === css && isAfterAllStylesheets(existing)) return;

  existing?.remove();
  const style = document.createElement('style');
  style.setAttribute('type', 'text/css');
  style.setAttribute('id', PRESET_STYLE_ID);
  style.textContent = css;
  head.appendChild(style);
}

/** `parameters.alPreset = { disable: true }` opts a story out entirely. */
function isDisabled(context: { parameters?: { alPreset?: { disable?: boolean } } }): boolean {
  return context.parameters?.alPreset?.disable === true;
}

export const withPreset: Decorator = (story, context) => {
  // Opt-out (R4). Used by the `<al-theme-switcher>` stories: that component
  // walks up for an `<al-theme>` ancestor (`theme-switcher.ts:108-113`) and
  // takes the scoped path when it finds one, and its own
  // `style#al-tokens-sheet` would land *before* our always-last block anyway.
  // Skipping BOTH halves leaves the component behaving exactly as it does on
  // main.
  if (isDisabled(context)) {
    applyTokens(null);
    return story();
  }

  const preset: Preset = getPreset(context.globals?.alPreset);
  applyTokens(presetTokens(preset));

  // `density` / `contrast` are written ONLY when the preset names them.
  // `:host([density='comfortable'])` is not a no-op — it overrides
  // `--al-theme-space-md` to 1rem where the bundle says 1.25rem — so an
  // unconditional `density="comfortable"` would change every story's spacing
  // versus today's baseline. See the `density` doc comment in `presets.ts`.
  return html`<al-theme
    brand=${preset.brand}
    mode=${preset.mode}
    density=${ifDefined(preset.density)}
    contrast=${ifDefined(preset.contrast)}
    data-al-preset=${preset.id}
    >${story()}</al-theme
  >`;
};
