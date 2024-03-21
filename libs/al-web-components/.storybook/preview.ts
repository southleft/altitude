import type { Preview } from '@storybook/web-components';

/*
 * Custom Elements
 * - Set custom elements manifest before any code runs. This enables autodocs from web components jsdoc comments.
 */
import { setCustomElementsManifest } from '@storybook/web-components';
import customElements from '../custom-elements.json';
setCustomElementsManifest(customElements);

/*
 * MFE's
 * - Setting auto registry to true to allow storybook to automatically register components
 */
globalThis.alAutoRegistry = true;

/*
 * Main styles
 * - Allows for custom styles of the story iframe window
 * - Creating a style element for mainStyles and appending it to the document head
 */
import mainStyles from '!!raw-loader!sass-loader!../styles/main.scss';
const mainStyleElement = document.createElement('style');
mainStyleElement.innerHTML = mainStyles;
mainStyleElement.setAttribute('type', 'text/css');
mainStyleElement.setAttribute('id', 'al-theme-sheet');
document.head.appendChild(mainStyleElement);

/*
 * Icon font styles
 * - Allows for the icon font to be avaiable in the story iframe window
 * - Creating a style element for iconFontCSS and appending it to the document head
 */
import iconFontCSS from '!!raw-loader!sass-loader!../components/icon/fonts/iconfont.css';
const iconFontStyleElement = document.createElement('style');
iconFontStyleElement.setAttribute('type', 'text/css');
iconFontStyleElement.setAttribute('id', 'iconfont-style');
iconFontStyleElement.innerHTML = iconFontCSS;
document.head.appendChild(iconFontStyleElement);

/*
 * Exclude's
 * - Properties and methods to be excluded from the storybook controls
 */
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
  '^_.*'
];

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on.*' },
    controls: {
      exclude: new RegExp(excludeRegexArray.join('|')),
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    // Configuring story sort order
    options: {
      storySort: {
        order: ['Resources', 'Foundations', 'Atoms', 'Molecules', 'Organisms', 'Templates', 'Pages', 'Recipes']
      }
    },
    backgrounds: { disable: true },
  },
  globalTypes: {
    stylesheets: {
      themes: [
        {
          id: "theme-dark",
          title: "Theme: Dark",
          url: "./css/tokens-dark.css",
        },
        {
          id: "theme-light",
          title: "Theme: Light",
          url: "./css/tokens-light.css",
        },
        {
          id: "brand-altitude",
          title: "Brand: Altitude",
          url: "./css/tokens-altitude.css",
        },
        {
          id: "brand-northright",
          title: "Brand: Northright",
          url: "./css/tokens-northright.css",
        },
        {
          id: "brand-southleft",
          title: "Brand: Southleft",
          url: "./css/tokens-southleft.css",
        }
      ]
    }
  }
};

export default preview;
