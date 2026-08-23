// Storybook 10 preview config for al-web-components.
//
// Deliberately kept in step with `libs/al-react/.storybook/preview.ts` — the
// two Storybooks are the same product in two renderers, so anything that is not
// forced to differ by the renderer should be identical in both files. What
// legitimately differs here: the CEM wiring (`setCustomElementsManifest`, the
// web-components equivalent of React's docgen), the `alAutoRegistry` import
// below, and the SCSS entrypoint (`main.scss` vs the built `main.css`).

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
import { DEFAULT_PRESET_ID } from './presets';
import { withPreset } from './with-preset';
import { AltitudeDocsPage } from './docs-page';

setCustomElementsManifest(customElements);

// Inject the global theme into the iframe.
const mainStyleElement = document.createElement('style');
mainStyleElement.innerHTML = mainStyles as unknown as string;
mainStyleElement.setAttribute('type', 'text/css');
mainStyleElement.setAttribute('id', 'al-theme-sheet');
document.head.appendChild(mainStyleElement);

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
  // Global autodocs switch. Storybook 10 dropped `docs.autodocs` from main.ts;
  // this tag is the replacement. Every component file already sets it locally,
  // so this mainly guarantees new components get a docs page by default.
  tags: ['autodocs'],

  // `alPreset` is still the global the decorator reads, but it is no longer a
  // DROPDOWN. The seven-recipe "Preset" menu is replaced by a one-click
  // light/dark toggle registered in `./manager.js`, over the two-entry
  // `./presets.ts`.
  //
  // The `toolbar` key is deliberately absent: declaring it would make core
  // render its own dropdown alongside the toggle. The global itself must stay
  // declared here so `updateGlobals({ alPreset })` from the manager is a
  // recognised write rather than an ad-hoc one.
  globalTypes: {
    alPreset: {
      name: 'Mode',
      description: 'Altitude light / dark',
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
    // The docs page every component renders. Forked from Storybook's own
    // `DocsPage` solely to hang an `<A11yReport>` under each story — `main.ts`
    // runs `docs.docsMode`, and docs entries get no addon panel, so the stock
    // a11y tab is unreachable. See `./docs-page.tsx`.
    docs: {
      page: AltitudeDocsPage,
    },
    options: {
      storySort: {
        // Nested arrays order the children of the category before them. `'*'`
        // is "everything not named", so the sub-folders sort AFTER the flat
        // primitives rather than pushing Button and Icon down the page.
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
    backgrounds: { disable: true },
  },
};

export default preview;
