// T2.4 — Storybook 10 preview config.
//
// Drops the webpack `!!raw-loader!sass-loader!…` imports and uses Vite's
// `?inline` query for the raw CSS. The CEM-driven `setCustomElementsManifest`
// still wires autodocs.

// MUST STAY FIRST. Storybook 10 + auto-register flag — components self-register
// when `alAutoRegistry` is true, mirroring the apps/web-components fixture.
// This used to be an assignment in this module's body, which is too late for
// any component module reached through the imports below: ES modules evaluate
// every static import before the importing module's body. `./with-preset`
// imports `../components/theme/theme`, whose registration guard
// (`theme.ts:58-60`) would then read the flag as `undefined`. See
// `./auto-registry.ts` for the full write-up.
import './auto-registry';

import type { Preview } from '@storybook/web-components';
import { setCustomElementsManifest } from '@storybook/web-components';
import { addons } from 'storybook/preview-api';
import { html } from 'lit';
import customElements from '../custom-elements.json';
import mainStyles from '../styles/main.scss?inline';
import { DEFAULT_PRESET_ID, PRESET_TOOLBAR_ITEMS } from './presets';
import { withPreset } from './with-preset';
import { EVENTS } from './ai-theme/constants';
import { applyTheme, resetTheme } from './ai-theme/apply';
import type { ApplyPayload } from './ai-theme/types';
// The docs page renders inside the preview iframe with its own theme, entirely
// separate from the manager chrome. Without this it stays on Storybook's light
// default, which is why the docs page read as a white slab against dark chrome.
import managerTheme from './theme';
// NOTE: this lives in `blocks/`, not `docs/`. The `./docs/*.@(js|jsx|ts|tsx|mdx)`
// stories glob in main.ts would otherwise try to index it as a story file and
// fail the build with "Unable to index".
import AltitudeDocsPage from './blocks/AltitudeDocsPage';

setCustomElementsManifest(customElements);

// The `iconFontCSS` import that used to sit here is gone with the webfont
// (`feat(icons)!: replace the 37-icon set with the full Phosphor library`).
// `components/icon/fonts/iconfont.css` is now an empty deprecation stub, so
// injecting it only added an empty <style id="iconfont-style"> to the iframe.

// Inject the global theme into the iframe.
const mainStyleElement = document.createElement('style');
mainStyleElement.innerHTML = mainStyles as unknown as string;
mainStyleElement.setAttribute('type', 'text/css');
mainStyleElement.setAttribute('id', 'al-theme-sheet');
document.head.appendChild(mainStyleElement);

// AI Theme addon (.storybook/ai-theme) — the manager panel derives a palette
// and pushes it over the addon channel; we write it as inline custom
// properties on <html>. Registered once at module scope rather than in a
// decorator so the theme survives story navigation instead of being torn
// down and re-applied on every render.
//
// getChannel() throws if the preview runtime hasn't installed the channel by
// the time this module evaluates, which would take the whole preview down.
// Poll instead: cheap, and a missing channel just means no AI theme.
//
// HOW THIS COEXISTS WITH THE PRESET DECORATOR (merged 2026-07-28). Two
// mechanisms now write theme state into this iframe, and they compose rather
// than fight, for two independent reasons:
//
//  1. `ai-theme/apply.ts::targets()` writes to `document.documentElement` AND
//     to every live `<al-theme>` element. It has to: the preset decorator's
//     wrapper carries `:host([brand])` rules, and a `:host` declaration beats a
//     value inherited from `<html>`. Writing the AI palette as an INLINE
//     property on the same host outranks the `:host` rule, so "AI theme on top
//     of the selected preset" is the resulting semantics — and Reset drops the
//     inline properties and falls back to the preset's brand.
//  2. The wrapper is recreated on every story render, so a one-shot apply would
//     be lost the moment you navigate or change the preset. `manager.tsx`
//     already re-asserts on `STORY_RENDERED` / `DOCS_RENDERED`, which is what
//     makes the AI palette land on the freshly-created `<al-theme>`.
//
// Neither side owns a `globalTypes` key the other uses: the preset switcher
// owns `alPreset`, the AI console owns no global at all.
function registerAiThemeChannel(attempt = 0): void {
  if (!addons.hasChannel()) {
    if (attempt < 20) setTimeout(() => registerAiThemeChannel(attempt + 1), 50);
    return;
  }
  const channel = addons.getChannel();
  channel.on(EVENTS.APPLY, (payload: ApplyPayload) => applyTheme(payload));
  channel.on(EVENTS.RESET, () => resetTheme());
}
registerAiThemeChannel();

export const excludeRegexArray = [
  '^children$',
  '^render$',
  '^firstUpdated$',
  '^componentClassNames$',
  '^slotEmpty$',
  '^slotNotEmpty$',
  '^dispatch$',
  '^renderOptions$',
  '^connectedCallback$',
  '^disconnectedCallback$',
  '^renderRoot$',
  '^isUpdatePending$',
  '^hasUpdated$',
  '^updated$',
  '^addController$',
  '^removeController$',
  '^attributeChangedCallback$',
  '^requestUpdate$',
  '^updateComplete$',
  '^on[A-Z].*',
  '^handle[A-Z].*',
  '^_.*',
];

/**
 * Gives a single-story view the same card chrome as the docs page.
 *
 * Selecting one story in the sidebar renders it bare on the canvas, which read
 * as a different product from the docs page it sits under. This wraps it in the
 * same frame + card (name on the left, addressable story id on the right) that
 * `AltitudeDocsPage` renders, so the two views are continuous.
 *
 * Scope is deliberately narrow:
 *  - Docs view is skipped — `AltitudeDocsPage` already supplies the card there,
 *    and wrapping again would nest two.
 *  - `layout: 'fullscreen'` is skipped. Pages and templates are meant to bleed
 *    to the viewport edge; boxing them would misrepresent them.
 *  - `parameters.alFrame = false` is an explicit per-story escape hatch.
 */
const storyFrame: NonNullable<Preview['decorators']>[number] = (story, context) => {
  if (context.viewMode !== 'story') return story();

  const layout = (context.parameters as any)?.layout;
  if (layout === 'fullscreen') return story();
  if ((context.parameters as any)?.alFrame === false) return story();

  return html`
    <div class="al-docs al-docs--story">
      <div class="al-docs__stories">
        <section class="al-docs__card">
          <div class="al-docs__card-head">
            <span class="al-docs__card-name">${context.name}</span>
            <span class="al-docs__card-id">${context.id}</span>
          </div>
          <div class="al-docs__card-body">${story()}</div>
        </section>
      </div>
    </div>
  `;
};

const preview: Preview = {
  // Global autodocs switch. Storybook 10 dropped `docs.autodocs` from main.ts;
  // this tag is the replacement. Every component file already sets it locally,
  // so this mainly guarantees new components get a docs page by default.
  tags: ['autodocs'],

  // Curated theme presets — one dropdown that snaps brand + mode + density +
  // contrast together. Items are DERIVED from `PRESETS`; adding a preset is a
  // one-line append in `./presets.ts` and nothing here changes.
  //
  // No addon is required: Storybook 10 renders `globalTypes` toolbars from
  // core (`useGlobalTypes` in `storybook/dist/manager/runtime.js`), so
  // `main.ts`'s addon list stays a11y + docs. This is also why it does not
  // collide with the AI Theme addon, which owns no global at all — it talks to
  // the preview over its own channel events (`./ai-theme/constants.ts`).
  globalTypes: {
    alPreset: {
      name: 'Preset',
      description: 'Brand + mode + density + contrast, snapped together',
      toolbar: {
        icon: 'paintbrush',
        items: PRESET_TOOLBAR_ITEMS,
        dynamicTitle: true,
      },
    },
  },
  // `globalTypes.defaultValue` is deprecated in SB 8+; `initialGlobals` is the
  // supported way to seed a global.
  initialGlobals: {
    alPreset: DEFAULT_PRESET_ID,
  },

  // ORDER MATTERS, and it is the reverse of how it reads.
  // `defaultDecorateStory` folds this array with `reduce`, so the LAST entry
  // is the OUTERMOST wrapper: `storyFrame( withPreset( story ) )`.
  //
  //   <div class="al-docs al-docs--story">   <- storyFrame (card chrome)
  //     <al-theme brand mode density …>      <- withPreset (the preset)
  //       …story…
  //
  // That nesting is deliberate. In docs view `AltitudeDocsPage` renders the
  // card itself and `withPreset` runs inside it, so putting the frame outside
  // here keeps the two views structurally identical. The card is chrome — it
  // is painted from `--al-docs-*` on `:root` (`.storybook/preview-head.html`),
  // not from `--al-theme-*` — so it deliberately does not change with the
  // brand, in either view.
  decorators: [withPreset, storyFrame],

  parameters: {
    docs: {
      theme: managerTheme,
      // Custom autodocs template. Attached MDX (`<Meta of={Stories} />`) still
      // takes precedence over this, so the Foundations pages are untouched.
      page: AltitudeDocsPage,
    },
    actions: { argTypesRegex: '^on.*' },
    controls: {
      exclude: new RegExp(excludeRegexArray.join('|')),
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: ['Resources', 'Foundations', 'Atoms', 'Molecules', 'Organisms', 'Templates', 'Pages', 'Recipes'],
      },
    },
    backgrounds: { disable: true },
  },
};

export default preview;
