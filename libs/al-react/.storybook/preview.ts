// T2.4 — Storybook 10 preview for al-react.

import type { Preview } from '@storybook/react-vite';
import mainStyles from '../../al-web-components/dist/css/main.css?inline';
import iconFontCSS from '../../al-web-components/components/icon/fonts/iconfont.css?inline';
import { DEFAULT_PRESET_ID, PRESET_TOOLBAR_ITEMS } from '../../al-web-components/.storybook/presets';
import { withPreset } from './with-preset';

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
  // Curated theme presets — the same dropdown the web-components Storybook
  // carries, over the SAME `presets.ts`. Items are DERIVED from `PRESETS`;
  // adding a preset there makes it appear in both Storybooks with no edit here
  // (R3: this file contains zero literal preset ids, labels or axis values).
  //
  // Storybook 10 renders `globalTypes` toolbars from core, so `main.ts`'s addon
  // list stays a11y-only.
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
