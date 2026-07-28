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
import customElements from '../custom-elements.json';
import mainStyles from '../styles/main.scss?inline';
import iconFontCSS from '../components/icon/fonts/iconfont.css?inline';
import { DEFAULT_PRESET_ID, PRESET_TOOLBAR_ITEMS } from './presets';
import { withPreset } from './with-preset';

setCustomElementsManifest(customElements);

// Inject the global theme + icon font into the iframe.
const mainStyleElement = document.createElement('style');
mainStyleElement.innerHTML = mainStyles as unknown as string;
mainStyleElement.setAttribute('type', 'text/css');
mainStyleElement.setAttribute('id', 'al-theme-sheet');
document.head.appendChild(mainStyleElement);

const iconFontStyleElement = document.createElement('style');
iconFontStyleElement.setAttribute('type', 'text/css');
iconFontStyleElement.setAttribute('id', 'iconfont-style');
iconFontStyleElement.innerHTML = iconFontCSS as unknown as string;
document.head.appendChild(iconFontStyleElement);

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

const preview: Preview = {
  // Curated theme presets — one dropdown that snaps brand + mode + density +
  // contrast together. Items are DERIVED from `PRESETS`; adding a preset is a
  // one-line append in `./presets.ts` and nothing here changes.
  //
  // No addon is required: Storybook 10 renders `globalTypes` toolbars from
  // core (`useGlobalTypes` in `storybook/dist/manager/runtime.js`), so
  // `main.ts`'s addon list stays a11y + docs.
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
  decorators: [withPreset],
  parameters: {
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
