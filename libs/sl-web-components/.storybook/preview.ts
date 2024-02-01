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
globalThis.enAutoRegistry = true;

/*
 * Storybook styles
 * - Allows for custom styles of the storybook UI
 * - Creating a style element for storybookStyles and appending it to the window parent document head
 */
import storybookStyles from '../styles/storybook.scss';
const storybookStyleElement = document.createElement('style');
storybookStyleElement.innerHTML = storybookStyles;
window.parent.document.head.appendChild(storybookStyleElement);

/*
 * Head styles
 * - Allows for custom styles of the story iframe window
 * - Creating a style element for headStyles and appending it to the document head
 */
import headStyles from '../styles/head.scss';
const headStyleElement = document.createElement('style');
headStyleElement.innerHTML = headStyles;
document.head.appendChild(headStyleElement);

/*
 * Icon font styles
 * - Allows for the icon font to be avaiable in the story iframe window
 * - Creating a style element for iconFontCSS and appending it to the document head
 */
import iconFontCSS from '../components/icon/fonts/iconfont.css';
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
        order: ['Documentation', 'Fundamentals', 'Atoms', 'Molecules', 'Organisms', 'Templates', 'Recipes']
      }
    },
    backgrounds: { disable: true },
  }
};

export default preview;
